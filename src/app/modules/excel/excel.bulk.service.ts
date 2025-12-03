import { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ServiceModelInstance } from '../service/service.model';
import { User } from '../user/user.model';
import { Subscription } from '../subscription/subscription.model';
import { USER_ROLES } from '../../../enums/user';
import { RedisCacheService, CACHE_PREFIXES } from '../redis/cache';
import stripe from '../../../config/stripe';
import * as XLSX from 'xlsx';

interface BulkUploadResult {
  [x: string]: any;
  success: number;
  failed: number;
  totalCars: number;
  carsWithinLimit: number;
  adHocCars: number;
  adHocCharges: number;
  errors: Array<{ row: number; error: string }>;
  successfulCars: any[];
}


const bulkUploadCarsForDealer = async (
  req: Request,
  file: Express.Multer.File
): Promise<BulkUploadResult> => {
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  
  const user = await User.findById(userId);
  if (!user || user.role !== USER_ROLES.DELEAR) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only DEALER can use bulk upload'
    );
  }

  console.log('👤 [Bulk Upload] User:', userId);
  console.log('📋 [Bulk Upload] User role:', user.role);

  const subscription = await Subscription.findOne({
    user: userId,
    status: 'active'
  }).populate('package');

  console.log('📊 [Bulk Upload] Subscription found:', !!subscription);
  console.log('📊 [Bulk Upload] Subscription status:', subscription?.status);

  if (!subscription) {
    const anySubscription = await Subscription.findOne({ user: userId }).sort({ createdAt: -1 });
    console.log('🔍 [Debug] Latest subscription status:', anySubscription?.status);
    
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `No active subscription found. Current status: ${anySubscription?.status || 'none'}`
    );
  }

  const carLimit = (subscription as any).getCarLimit(); 
  const adHocPrice = (subscription as any).getAdHocPrice();
  const currentCars = subscription.carsAdded || 0;

  console.log('📈 [Limits] Car limit:', carLimit);
  console.log('📈 [Limits] Current cars:', currentCars);
  console.log('💰 [Limits] Ad-hoc price:', adHocPrice);

  // Parse Excel file
  let carsData: any[];
  try {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    carsData = XLSX.utils.sheet_to_json(worksheet);

    if (carsData.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Excel file is empty');
    }
    
    console.log('📄 [Excel] Parsed cars:', carsData.length);
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Failed to parse Excel: ${error.message}`
    );
  }

  const vinNumbers = carsData
    .map(car => car['VIN Number'] || car['vinNo'])
    .filter(Boolean);

  console.log('🔍 [Duplicate Check] Checking', vinNumbers.length, 'VIN numbers');

  const existingCars = await ServiceModelInstance.find({
    createdBy: userId,
    $or: [
      { 'basicInformation.vinNo': { $in: vinNumbers } },
      ...carsData.map(car => ({
        'basicInformation.vehicleName': car['Vehicle Name'] || car['vehicleName'],
        'basicInformation.brand': car['Brand ID'] || car['brand'],
        'basicInformation.model': car['Model ID'] || car['model']
      })).filter(query => query['basicInformation.vehicleName'])
    ]
  }).select('basicInformation.vinNo basicInformation.vehicleName basicInformation.brand basicInformation.model');

  const existingVINs = new Set(
    existingCars
      .map(car => car.basicInformation?.vinNo)
      .filter(Boolean)
  );

  const existingCarKeys = new Set(
    existingCars.map(car => 
      `${car.basicInformation?.vehicleName}_${car.basicInformation?.brand}_${car.basicInformation?.model}`
    )
  );

  console.log('🔍 [Duplicate Check] Found', existingVINs.size, 'existing VINs');
  console.log('🔍 [Duplicate Check] Found', existingCarKeys.size, 'existing car combinations');

  // Filter out new cars only
  const newCarsOnly = carsData.filter((carData, index) => {
    const vin = carData['VIN Number'] || carData['vinNo'];
    const vehicleName = carData['Vehicle Name'] || carData['vehicleName'];
    const brand = carData['Brand ID'] || carData['brand'];
    const model = carData['Model ID'] || carData['model'];
    const carKey = `${vehicleName}_${brand}_${model}`;

    // Check if car already exists
    const isDuplicateVIN = vin && existingVINs.has(vin);
    const isDuplicateCar = existingCarKeys.has(carKey);

    if (isDuplicateVIN || isDuplicateCar) {
      console.log(`⏭️ [Row ${index + 2}] Skipping duplicate: ${vehicleName} (VIN: ${vin || 'N/A'})`);
      return false;
    }

    return true;
  });

  console.log('✅ [Filter] New cars to add:', newCarsOnly.length);
  console.log('⏭️ [Filter] Duplicates skipped:', carsData.length - newCarsOnly.length);

  // Calculate charges based on NEW cars only
  const totalCarsToAdd = newCarsOnly.length;
  
  if (totalCarsToAdd === 0) {
    return {
      success: 0,
      failed: 0,
      totalCars: carsData.length,
      carsWithinLimit: 0,
      adHocCars: 0,
      adHocCharges: 0,
      errors: [{
        row: 0,
        error: `All ${carsData.length} car(s) already exist. No new cars to add.`
      }],
      successfulCars: [],
      skipped: carsData.length
    };
  }

  const newTotal = currentCars + totalCarsToAdd;
  
  let carsWithinLimit = 0;
  let adHocCars = 0;

  if (newTotal <= carLimit) {
    carsWithinLimit = totalCarsToAdd;
  } else if (currentCars < carLimit) {
    carsWithinLimit = carLimit - currentCars;
    adHocCars = newTotal - carLimit;
  } else {
    adHocCars = totalCarsToAdd;
  }

  const adHocCharges = adHocCars * adHocPrice;

  console.log('💳 [Charges] Cars within limit:', carsWithinLimit);
  console.log('💳 [Charges] Ad-hoc cars:', adHocCars);
  console.log('💳 [Charges] Ad-hoc charges:', adHocCharges);

  // Create Stripe invoice if needed
  if (adHocCars > 0) {
    try {
      await stripe.invoiceItems.create({
        customer: subscription.customerId,
        amount: Math.round(adHocCharges * 100),
        currency: 'usd',
        description: `Bulk upload: ${adHocCars} ad-hoc car(s)`,
        subscription: subscription.subscriptionId
      });
      console.log('✅ [Stripe] Invoice item created');
    } catch (error: any) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Payment processing failed: ${error.message}`
      );
    }
  }

  // Process each NEW car only
  const result: BulkUploadResult = {
    success: 0,
    failed: 0,
    totalCars: carsData.length,
    carsWithinLimit,
    adHocCars,
    adHocCharges,
    errors: [],
    successfulCars: [],
    skipped: carsData.length - newCarsOnly.length
  };

  // Get the original row numbers for new cars
  const newCarsWithRowNumbers = newCarsOnly.map(carData => {
    const originalIndex = carsData.findIndex(original => original === carData);
    return {
      data: carData,
      rowNumber: originalIndex + 2
    };
  });

  for (const { data: carData, rowNumber } of newCarsWithRowNumbers) {
    try {
      const serviceData = {
        basicInformation: {
          vehicleName: carData['Vehicle Name'] || carData['vehicleName'],
          brand: carData['Brand ID'] || carData['brand'],
          model: carData['Model ID'] || carData['model'],
          vinNo: carData['VIN Number'] || carData['vinNo'],
          year: Number(carData['Year'] || carData['year']),
          RegularPrice: Number(carData['Regular Price'] || carData['RegularPrice']),
          OfferPrice: Number(carData['Offer Price'] || carData['OfferPrice']),
          condition: carData['Condition'] || carData['condition'],
          miles: Number(carData['Miles'] || carData['miles'] || 0),
          BodyType: carData['Body Type'] || carData['BodyType'],
        },
        technicalInformation: {
          fuelType: carData['Fuel Type'] || carData['fuelType'],
          transmission: carData['Transmission'] || carData['transmission'],
          driveType: carData['Drive Type'] || carData['driveType'],
        },
        colour: {
          exterior: carData['Exterior Color'] || carData['exterior'],
          interior: carData['Interior Color'] || carData['interior'],
        },
        seatsAndDoors: {
          seats: Number(carData['Seats'] || carData['seats'] || 0),
          doors: Number(carData['Doors'] || carData['doors'] || 0),
        },
        location: {
          city: carData['City'] || carData['city'],
          country: carData['Country'] || carData['country'],
          address: carData['Address'] || carData['address'],
        },
        description: carData['Description'] || carData['description'],
        createdBy: userId,
        status: 'ACTIVE'
      };

      // Validate required fields
      if (!serviceData.basicInformation.brand || 
          !serviceData.basicInformation.model || 
          !serviceData.basicInformation.vehicleName) {
        throw new Error('Missing required: Brand, Model, or Vehicle Name');
      }

      console.log(`🚗 [Row ${rowNumber}] Creating car:`, serviceData.basicInformation.vehicleName);

      const service = await ServiceModelInstance.create(serviceData);
      
      result.success++;
      result.successfulCars.push({
        row: rowNumber,
        vehicleName: serviceData.basicInformation.vehicleName,
        _id: service._id
      });

      console.log(`✅ [Row ${rowNumber}] Car created successfully`);
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        row: rowNumber,
        error: error.message
      });
      console.error(`❌ [Row ${rowNumber}] Error:`, error.message);
    }
  }

  console.log('📊 [Summary] Success:', result.success, 'Failed:', result.failed, 'Skipped:', result.skipped);

  if (result.success > 0) {
    subscription.carsAdded = currentCars + result.success;
    subscription.adHocCars = (subscription.adHocCars || 0) + adHocCars;
    subscription.adHocCharges = (subscription.adHocCharges || 0) + adHocCharges;
    await subscription.save();
    console.log('✅ [Subscription] Updated - Total cars:', subscription.carsAdded);
  }

  await RedisCacheService.deletePattern(`${CACHE_PREFIXES.SERVICES}:*`);
  console.log('🗑️ [Cache] Cleared');

  return result;
};

/**
 * Download Excel template
 */

const getExcelTemplate = (): Buffer => {
  const templateData = [{
    'Vehicle Name': 'BMW X5 2023',
    'Brand ID': '65abc123...',
    'Model ID': '65def456...',
    'VIN Number': 'WBA12345ABCD67890',
    'Year': 2023,
    'Regular Price': 50000,
    'Offer Price': 47000,
    'Condition': 'Used',
    'Miles': 15000,
    'Body Type': 'SUV',
    'Fuel Type': 'Petrol',
    'Transmission': 'Automatic',
    'Drive Type': 'AWD',
    'Exterior Color': 'Black',
    'Interior Color': 'Beige',
    'Seats': 5,
    'Doors': 5,
    'City': 'Zurich',
    'Country': 'Switzerland',
    'Address': '123 Main Street',
    'Description': 'Excellent condition'
  }];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cars Template');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

export const DealerBulkService = {
  bulkUploadCarsForDealer,
  getExcelTemplate
};
// interface BulkUploadResult {
//   success: number;
//   failed: number;
//   totalCars: number;
//   carsWithinLimit: number;
//   adHocCars: number;
//   adHocCharges: number;
//   totalCost: number;
//   errors: Array<{ row: number; error: string; data: any }>;
//   successfulCars: any[];
// }

// /**
//  * Bulk upload cars from Excel for DEALER
//  * Automatically charges ad-hoc fees when package limit exceeded
//  */
// const bulkUploadCarsForDealer = async (
//   req: Request,
//   file: Express.Multer.File
// ): Promise<BulkUploadResult> => {
//   const userId = (req as any).user?.id || (req as any).user?._id;

//   if (!userId) {
//     throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
//   }

//   // Get user details
//   const user = await User.findById(userId);
//   if (!user) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
//   }

//   // ========== DEALER VERIFICATION ==========
//   if (user.role !== USER_ROLES.DELEAR) {
//     throw new ApiError(
//       StatusCodes.FORBIDDEN,
//       'Only DEALER can use bulk upload. SELLER should add cars individually.'
//     );
//   }

//   // Check if user has an active subscription
//   if (!user.isSubscribed) {
//     throw new ApiError(
//       StatusCodes.FORBIDDEN,
//       'You need an active subscription to add cars. Please subscribe to a package first.'
//     );
//   }

//   // Get subscription details
//   const subscription = await Subscription.findOne({
//     user: userId,
//     status: 'active'
//   }).populate('package');

//   if (!subscription) {
//     throw new ApiError(
//       StatusCodes.NOT_FOUND,
//       'No active subscription found. Please subscribe to a package.'
//     );
//   }

//   const packageData: any = subscription.package;
//   const carLimit = packageData.carLimit || 4;
//   const adHocPricePerCar = packageData.adHocPricePerCar || 2.5;
//   const currentCarsAdded = subscription.carsAdded || 0;

//   console.log(`📊 [DEALER] Current Status: ${currentCarsAdded}/${carLimit} cars`);

//   // ========== PARSE EXCEL FILE ==========
//   let carsData: any[] = [];
//   try {
//     const workbook = XLSX.read(file.buffer, { type: 'buffer' });
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     carsData = XLSX.utils.sheet_to_json(worksheet);

//     if (carsData.length === 0) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, 'Excel file is empty');
//     }

//     console.log(`📄 [DEALER] Parsed ${carsData.length} cars from Excel`);
//   } catch (error: any) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       `Failed to parse Excel file: ${error.message}`
//     );
//   }

//   // ========== CALCULATE CHARGES ==========
//   const totalCarsToAdd = carsData.length;
//   const newTotalCars = currentCarsAdded + totalCarsToAdd;
  
//   let carsWithinLimit = 0;
//   let adHocCars = 0;
//   let adHocCharges = 0;

//   if (newTotalCars <= carLimit) {
//     // All cars within limit
//     carsWithinLimit = totalCarsToAdd;
//   } else if (currentCarsAdded < carLimit) {
//     // Some within limit, some exceed
//     carsWithinLimit = carLimit - currentCarsAdded;
//     adHocCars = newTotalCars - carLimit;
//     adHocCharges = adHocCars * adHocPricePerCar;
//   } else {
//     // All cars exceed limit
//     adHocCars = totalCarsToAdd;
//     adHocCharges = adHocCars * adHocPricePerCar;
//   }

//   console.log(`💰 [DEALER] Charges: ${carsWithinLimit} free + ${adHocCars} ad-hoc ($${adHocCharges})`);

//   // ========== CREATE STRIPE INVOICE ITEMS FOR AD-HOC CHARGES ==========
//   if (adHocCars > 0) {
//     try {
//       await stripe.invoiceItems.create({
//         customer: subscription.customerId,
//         amount: Math.round(adHocCharges * 100), // Convert to cents
//         currency: 'usd',
//         description: `Bulk Upload: ${adHocCars} additional cars - Ad-hoc charges`,
//         subscription: subscription.subscriptionId
//       });

//       console.log(`✅ [DEALER] Stripe invoice item created: $${adHocCharges}`);
//     } catch (error: any) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         `Failed to process ad-hoc payment: ${error.message}`
//       );
//     }
//   }

//   // ========== PROCESS EACH CAR ==========
//   const result: BulkUploadResult = {
//     success: 0,
//     failed: 0,
//     totalCars: totalCarsToAdd,
//     carsWithinLimit,
//     adHocCars,
//     adHocCharges,
//     totalCost: subscription.price + subscription.adHocCharges + adHocCharges,
//     errors: [],
//     successfulCars: []
//   };

//   for (let i = 0; i < carsData.length; i++) {
//     const carData = carsData[i];
//     const rowNumber = i + 2; // Excel row (starting from 2, assuming row 1 is header)

//     try {
//       // Map Excel columns to your service schema
//       const serviceData = {
//         basicInformation: {
//           vehicleName: carData['Vehicle Name'] || carData['vehicleName'],
//           brand: carData['Brand ID'] || carData['brand'],
//           model: carData['Model ID'] || carData['model'],
//           vinNo: carData['VIN Number'] || carData['vinNo'],
//           year: Number(carData['Year'] || carData['year']),
//           RegularPrice: Number(carData['Regular Price'] || carData['RegularPrice']),
//           OfferPrice: Number(carData['Offer Price'] || carData['OfferPrice']),
//           condition: carData['Condition'] || carData['condition'],
//           miles: Number(carData['Miles'] || carData['miles'] || 0),
//           BodyType: carData['Body Type'] || carData['BodyType'],
//         },
//         technicalInformation: {
//           fuelType: carData['Fuel Type'] || carData['fuelType'],
//           transmission: carData['Transmission'] || carData['transmission'],
//           driveType: carData['Drive Type'] || carData['driveType'],
//         },
//         colour: {
//           exterior: carData['Exterior Color'] || carData['exterior'],
//           interior: carData['Interior Color'] || carData['interior'],
//         },
//         seatsAndDoors: {
//           seats: Number(carData['Seats'] || carData['seats'] || 0),
//           doors: Number(carData['Doors'] || carData['doors'] || 0),
//         },
//         location: {
//           city: carData['City'] || carData['city'],
//           country: carData['Country'] || carData['country'],
//           address: carData['Address'] || carData['address'],
//         },
//         description: carData['Description'] || carData['description'],
//         createdBy: userId,
//         status: 'PENDING'
//       };

//       // Validate required fields
//       if (!serviceData.basicInformation.brand || 
//           !serviceData.basicInformation.model || 
//           !serviceData.basicInformation.vehicleName) {
//         throw new Error('Missing required fields: Brand, Model, or Category');
//       }

//       // Create service
//       const service = await ServiceModelInstance.create(serviceData);
      
//       result.success++;
//       result.successfulCars.push({
//         row: rowNumber,
//         vehicleName: serviceData.basicInformation.vehicleName,
//         _id: service._id
//       });

//       console.log(`✅ [DEALER] Row ${rowNumber}: Car created successfully`);
//     } catch (error: any) {
//       result.failed++;
//       result.errors.push({
//         row: rowNumber,
//         error: error.message,
//         data: carData
//       });

//       console.error(`❌ [DEALER] Row ${rowNumber}: ${error.message}`);
//     }
//   }

//   // ========== UPDATE SUBSCRIPTION ==========
//   if (result.success > 0) {
//     subscription.carsAdded = newTotalCars;
//     subscription.adHocCars = (subscription.adHocCars || 0) + adHocCars;
//     subscription.adHocCharges = (subscription.adHocCharges || 0) + adHocCharges;
//     await subscription.save();

//     console.log(`📊 [DEALER] Updated subscription: ${subscription.carsAdded} total cars, ${subscription.adHocCars} ad-hoc cars`);
//   }

//   // ========== INVALIDATE CACHE ==========
//   await RedisCacheService.deletePattern(`${CACHE_PREFIXES.SERVICES}:*`);

//   console.log(`🎉 [DEALER] Bulk upload complete: ${result.success} success, ${result.failed} failed`);

//   return result;
// };

// /**
//  * Download Excel template for bulk upload
//  */
// const getExcelTemplate = (): Buffer => {
//   const templateData = [
//     {
//       'Vehicle Name': 'BMW X5 2023',
//       'Brand ID': '65abc123...',
//       'Model ID': '65def456...',
//       'VIN Number': 'WBA12345ABCD67890',
//       'Year': 2023,
//       'Regular Price': 50000,
//       'Offer Price': 47000,
//       'Condition': 'Used',
//       'Miles': 15000,
//       'Body Type': 'SUV',
//       'Fuel Type': 'Petrol',
//       'Transmission': 'Automatic',
//       'Drive Type': 'AWD',
//       'Exterior Color': 'Black',
//       'Interior Color': 'Beige',
//       'Seats': 5,
//       'Doors': 5,
//       'City': 'Zurich',
//       'Country': 'Switzerland',
//       'Address': '123 Main Street',
//       'Description': 'Excellent condition, well maintained'
//     }
//   ];

//   const worksheet = XLSX.utils.json_to_sheet(templateData);
//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, 'Cars Template');

//   return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
// };

// export const DealerBulkService = {
//   bulkUploadCarsForDealer,
//   getExcelTemplate
// };