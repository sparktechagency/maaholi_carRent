import { StatusCodes } from 'http-status-codes'
import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose'
import { CareCompareModelInstance, ServiceModelInstance } from './service.model'
import { IService } from './service.interface'
import ApiError from '../../../errors/ApiError'
import { FilterQuery, SortOrder } from 'mongoose'
import { paginateAndSort } from '../../../util/pagination.on';
import { CarManagementService } from '../car_Management/car.service';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { CACHE_PREFIXES, CACHE_TTL, RedisCacheService } from '../redis/cache';
import { ServiceFilterQuery } from './service.query.filter';
import { Subscription } from '../subscription/subscription.model';
import { parseFormData } from '../../../helpers/nestedObject.helper';
import { JwtPayload } from 'jsonwebtoken';


export const createServiceToDB = async (
  req: Request,
  payload: any,
  files?: { [fieldname: string]: Express.Multer.File[] }
): Promise<IService> => {
  const parsedData = parseFormData(payload, files);

  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');

  if (user.role !== USER_ROLES.SELLER && user.role !== USER_ROLES.DELEAR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only SELLER and DELEAR can create services');
  }

  // Check subscription limits
  // const subscription = await Subscription.findOne({ user: userId, status: 'active' }).populate('package');
  // if (!subscription) throw new ApiError(StatusCodes.FORBIDDEN, 'No active subscription found');

  // const packageData: any = subscription.package;
  // const carLimit = packageData?.carLimit || 4;
  // if ((subscription.carsAdded || 0) >= carLimit) {
  //   throw new ApiError(StatusCodes.FORBIDDEN, `Package limit reached: ${carLimit}`);
  // }
  // subscription.carsAdded = (subscription.carsAdded || 0) + 1;
  // await subscription.save();

  // Convert brand/model to ObjectId
  if (parsedData.basicInformation?.brand) {
    parsedData.basicInformation.brand = new Types.ObjectId(parsedData.basicInformation.brand);
  }
  if (parsedData.basicInformation?.model) {
    parsedData.basicInformation.model = new Types.ObjectId(parsedData.basicInformation.model);
  }

  parsedData.createdBy = userId;

  // Create the service
  const service = await ServiceModelInstance.create(parsedData);

  // Populate references
  await service.populate([
    { path: 'basicInformation.brand', select: 'brand image' },
    { path: 'basicInformation.model', select: 'model brand' },
    { path: 'createdBy', select: 'name email location address' }
  ]);

  // Clear cache
  await RedisCacheService.deletePattern(`${CACHE_PREFIXES.SERVICES}:*`);

  return service;
};


// const getAllServicesFromDB = async (query: any) => {
//   const {
//     page = 1,
//     limit = 10,
//     sort = '-createdAt',
//     search = '',
//     status,
//     userId,
//     city,
//     country
//   } = query

//   const pageNum = parseInt(page as string)
//   const limitNum = parseInt(limit as string)
//   const skip = (pageNum - 1) * limitNum

//   // Build query
//   const searchQuery: any = { isDeleted: false }
//   if (search) {
//     searchQuery.$or = [
//       { 'basicInformation.make': { $regex: search, $options: 'i' } },
//       { 'basicInformation.model': { $regex: search, $options: 'i' } },
//       { 'basicInformation.vin': { $regex: search, $options: 'i' } },
//       { 'basicInformation.tagNumber': { $regex: search, $options: 'i' } },
//       { 'location.address': { $regex: search, $options: 'i' } }
//     ]
//   }

//   if (status) searchQuery.status = status
//   if (userId) searchQuery.user = new Types.ObjectId(userId as string)
//   if (city) searchQuery['location.city'] = { $regex: city, $options: 'i' }
//   if (country) searchQuery['location.country'] = { $regex: country, $options: 'i' }

//   const [services, total] = await Promise.all([
//     ServiceModelInstance
//       .find(searchQuery)
//       .populate('user', 'name email')
//       .populate('basicInformation.brand', 'brand image')  
//       .populate('basicInformation.model', 'model brand')
//       .populate('createdBy', 'name email profile')
//       .sort(sort as string)
//       .skip(skip)
//       .limit(limitNum)
//       .lean(),
//     ServiceModelInstance.countDocuments(searchQuery)
//   ])

//   return {
//     data: services,
//     meta: {
//       total,
//       page: pageNum,
//       limit: limitNum,
//       totalPages: Math.ceil(total / limitNum)
//     }
//   }
// }
const getAllServicesFromDB = async (query: any) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    search = '',
    status,
    userId,
    city,
    country
  } = query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const searchQuery: any = { isDeleted: false };
  if (search) {
    searchQuery.$or = [
      { 'basicInformation.make': { $regex: search, $options: 'i' } },
      { 'basicInformation.model': { $regex: search, $options: 'i' } },
      { 'basicInformation.vin': { $regex: search, $options: 'i' } },
      { 'basicInformation.tagNumber': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } }
    ];
  }

  if (status) searchQuery.status = status;
  if (userId) searchQuery.user = new Types.ObjectId(userId as string);
  if (city) searchQuery['location.city'] = { $regex: city, $options: 'i' };
  if (country) searchQuery['location.country'] = { $regex: country, $options: 'i' };

  const [services, total] = await Promise.all([
    ServiceModelInstance
      .find(searchQuery)
      .populate('user', 'name email')
      .populate('basicInformation.brand', 'brand image')  
      .populate('basicInformation.model', 'model brand')
      .populate('createdBy', 'name email profile')
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ServiceModelInstance.countDocuments(searchQuery)
  ]);

  // ✅ Transform data to include only first image
  const transformedServices = services.map((service: any) => {
    const productImages = service.basicInformation?.productImage || [];
    
    return {
      ...service,
      featuredImage: productImages.length > 0 ? productImages[0] : null,
      // Or keep all images but in a cleaner format
      imageUrl: productImages.length > 0 ? productImages[0] : null,
      allImages: productImages
    };
  });

  return {
    data: transformedServices,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};
const getAllFilterFromDB = async (requestData: any) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    search = '',
    filters = {},
  } = requestData; // Changed from query to requestData

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  // Helper functions - defined at the top so they're accessible everywhere
  const ensureArray = (val: any) => Array.isArray(val) ? val : [val];
  
  const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  };
  
  const searchQuery: any = { isDeleted: false };

  // Free-text search
  if (search && search.trim()) {
    searchQuery.$or = [
      { 'basicInformation.vehicleName': { $regex: search, $options: 'i' } },
      { 'basicInformation.vinNo': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } },
    ];
  }

  // Filter mapping
  if (filters && Object.keys(filters).length > 0) {
    const {
      condition,
      brand,
      model,
      category,
      priceRange,
      yearRange,
      mileageRange,
      fuelType,
      driveType,
      transmission,
      cylinders,
      towingCapacity,
      curbWeight,
      numberOfSeats,
      numberOfDoors,
      fuelConsumption,
      energyEfficiencyClass,
      country,
      city,
      equipment,
      bodyType,
    } = filters;

    // Basic Information Filters
    if (condition) {
      searchQuery['basicInformation.condition'] = { $in: ensureArray(condition) };
    }

    if (brand) {
      const brandArray = ensureArray(brand);
      const validBrands = brandArray.filter((b: any) => isValidObjectId(b));
      if (validBrands.length > 0) {
        searchQuery['basicInformation.brand'] = { 
          $in: validBrands.map((b: any) => new mongoose.Types.ObjectId(b))
        };
      }
    }

    if (model) {
      const modelArray = ensureArray(model);
      const validModels = modelArray.filter((m: any) => isValidObjectId(m));
      if (validModels.length > 0) {
        searchQuery['basicInformation.model'] = { 
          $in: validModels.map((m: any) => new mongoose.Types.ObjectId(m))
        };
      }
    }

    if (category) {
      const categoryArray = ensureArray(category);
      const validCategories = categoryArray.filter((c: any) => isValidObjectId(c));
      if (validCategories.length > 0) {
        searchQuery['basicInformation.Category'] = { 
          $in: validCategories.map((c: any) => new mongoose.Types.ObjectId(c))
        };
      }
    }

    if (bodyType) {
      searchQuery['basicInformation.BodyType'] = { $in: ensureArray(bodyType) };
    }

    // Price Range Filter
    if (priceRange && Array.isArray(priceRange) && priceRange.length === 2) {
      const [min, max] = priceRange;
      if (min != null && max != null) {
        searchQuery['basicInformation.RegularPrice'] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }
    }

    // Year Range Filter
    if (yearRange && Array.isArray(yearRange) && yearRange.length === 2) {
      const [min, max] = yearRange;
      if (min != null && max != null) {
        searchQuery['basicInformation.year'] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }
    }

    // Mileage Range Filter
    if (mileageRange && Array.isArray(mileageRange) && mileageRange.length === 2) {
      const [min, max] = mileageRange;
      if (min != null && max != null) {
        searchQuery['basicInformation.miles'] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }
    }

    // Technical Information Filters
    if (fuelType) {
      searchQuery['technicalInformation.fuelType'] = { $in: ensureArray(fuelType) };
    }

    if (driveType) {
      searchQuery['technicalInformation.driveType'] = { $in: ensureArray(driveType) };
    }

    if (transmission) {
      searchQuery['technicalInformation.transmission'] = { $in: ensureArray(transmission) };
    }

    if (cylinders) {
      searchQuery['technicalInformation.cylinders'] = { $in: ensureArray(cylinders) };
    }

    // Electric & Hybrid Filters
    if (towingCapacity && Array.isArray(towingCapacity) && towingCapacity.length === 2) {
      const [min, max] = towingCapacity;
      if (min != null && max != null) {
        searchQuery['electricHybrid.towingCapacity'] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }
    }

    if (curbWeight && Array.isArray(curbWeight) && curbWeight.length === 2) {
      const [min, max] = curbWeight;
      if (min != null && max != null) {
        searchQuery['electricHybrid.curbWeight'] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }
    }

    // Seats & Doors Filters
    if (numberOfSeats) {
      searchQuery['seatsAndDoors.seats'] = { $in: ensureArray(numberOfSeats).map(Number) };
    }

    if (numberOfDoors) {
      searchQuery['seatsAndDoors.doors'] = { $in: ensureArray(numberOfDoors).map(Number) };
    }

    // Energy & Environment Filters
    if (fuelConsumption) {
      searchQuery['energyAndEnvironment.fuelConsumption'] = { $regex: fuelConsumption, $options: 'i' };
    }

    if (energyEfficiencyClass) {
      searchQuery['energyAndEnvironment.energyEfficiencyClass'] = { $in: ensureArray(energyEfficiencyClass) };
    }

    // Location Filters
    if (country) {
      searchQuery['location.country'] = { $regex: country, $options: 'i' };
    }

    if (city) {
      searchQuery['location.city'] = { $regex: city, $options: 'i' };
    }

    // Equipment Filters - equipment is an object with boolean fields
    if (equipment && Array.isArray(equipment) && equipment.length > 0) {
      equipment.forEach((equipmentItem: string) => {
        searchQuery[`equipment.${equipmentItem}`] = true;
      });
    }
  }

  // Log query for debugging
  console.log('MongoDB Query:', JSON.stringify(searchQuery, null, 2));

  // Execute query
  const populateOptions: any = [
    { path: 'basicInformation.brand', select: 'name' },
    { path: 'basicInformation.model', select: 'name' },
    { path: 'basicInformation.Category', select: 'name' },
    { path: 'user', select: 'name email' },
    { path: 'createdBy', select: 'name email' }
  ];

  // Add match conditions only if brandName or modelName filters exist
  if (filters?.brandName) {
    populateOptions[0].match = { name: { $in: ensureArray(filters.brandName) } };
  }
  if (filters?.modelName) {
    populateOptions[1].match = { name: { $in: ensureArray(filters.modelName) } };
  }

  const [services, total] = await Promise.all([
    ServiceModelInstance
      .find(searchQuery)
      .populate(populateOptions)
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ServiceModelInstance.countDocuments(searchQuery),
  ]);

  // Filter out documents where populated fields are null (only if name filters were applied)
  let filteredServices = services;
  if (filters?.brandName || filters?.modelName) {
    filteredServices = services.filter(service => {
      if (filters?.brandName && !service.basicInformation?.brand) return false;
      if (filters?.modelName && !service.basicInformation?.model) return false;
      return true;
    });
  }

  return {
    data: filteredServices,
    meta: {
      total: filters?.brandName || filters?.modelName ? filteredServices.length : total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((filters?.brandName || filters?.modelName ? filteredServices.length : total) / limitNum),
    },
  };
};

 const getAllServicesFromDBFilter = async (query: ServiceFilterQuery) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    // Extract all filter params
    vehicleName,
    brand,
    model,
    Category,
    vinNo,
    yearFrom,
    yearTo,
    priceFrom,
    priceTo,
    condition,
    milesFrom,
    milesTo,
    MfkWarranty,
    AccidentVehicle,
    BodyType,
    fuelType,
    driveType,
    transmission,
    engineType,
    performance,
    batteryCapacityFrom,
    batteryCapacityTo,
    rangeFrom,
    rangeTo,
    tires,
    season,
    handicapAccessible,
    raceCar,
    tuning,
    exterior,
    interior,
    metallic,
    seatsFrom,
    seatsTo,
    doorsFrom,
    doorsTo,
    city,
    country,
    status,
    // Equipment booleans (sent as string "true"/"false" from frontend)
    ABS,
    Camera,
    AdaptiveCruiseControl,
    AlarmSystem,
    ElectricSeatAdjustment,
    Towbar,
    LeatherAlcantaraFabricSeats,
    HeatedVentilatedSeats,
    SunroofPanoramicRoof,
    AndroidAuto,
    NavigationSystem,
    ParkingSensors,
    HeadUpDisplay,
    XenonLEDHeadlights,
    KeylessEntryStart,
    Isofix,
    StartStopSystem,
    TheftProtection,
    ClimateControl,
    SportsSeats,
    SpeedLimiter,
    StabilityControlESP,
    SoundSystem,
  } = query;

  // Build $and array to safely combine all conditions
  const andConditions: any[] = [{ isDeleted: false }];

  // 1. Global Search Term
  if (searchTerm) {
    andConditions.push({
      $or: [
        { 'basicInformation.vehicleName': { $regex: searchTerm, $options: 'i' } },
        { 'basicInformation.vinNo': { $regex: searchTerm, $options: 'i' } },
        { 'basicInformation.condition': { $regex: searchTerm, $options: 'i' } },
        { 'location.city': { $regex: searchTerm, $options: 'i' } },
        { 'location.country': { $regex: searchTerm, $options: 'i' } },
        { 'technicalInformation.fuelType': { $regex: searchTerm, $options: 'i' } },
        { 'colour.exterior': { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  // 2. Price Range (matches RegularPrice OR OfferPrice)
  if (priceFrom || priceTo) {
    const priceCondition: any = {};
    if (priceFrom) priceCondition.$gte = Number(priceFrom);
    if (priceTo) priceCondition.$lte = Number(priceTo);

    andConditions.push({
      $or: [
        { 'basicInformation.RegularPrice': priceCondition },
        { 'basicInformation.OfferPrice': priceCondition },
      ],
    });
  }

  // 3. Number Range Filters
  const ranges = [
    { from: yearFrom, to: yearTo, path: 'basicInformation.year' },
    { from: milesFrom, to: milesTo, path: 'basicInformation.miles' },
    { from: seatsFrom, to: seatsTo, path: 'seatsAndDoors.seats' },
    { from: doorsFrom, to: doorsTo, path: 'seatsAndDoors.doors' },
    { from: batteryCapacityFrom, to: batteryCapacityTo, path: 'electricHybrid.batteryCapacityKWh' },
    { from: rangeFrom, to: rangeTo, path: 'electricHybrid.rangeKm' },
  ];

  ranges.forEach(({ from, to, path }) => {
    if (from || to) {
      const condition: any = {};
      if (from) condition.$gte = Number(from);
      if (to) condition.$lte = Number(to);
      andConditions.push({ [path]: condition });
    }
  });

  // 4. Exact or Regex Matches
  const fieldMap: Record<string, string> = {
    brand: 'basicInformation.brand',
    model: 'basicInformation.model',
    Category: 'basicInformation.Category',
    condition: 'basicInformation.condition',
    status: 'status',
    BodyType: 'basicInformation.BodyType',
    MfkWarranty: 'basicInformation.MfkWarranty',
    AccidentVehicle: 'basicInformation.AccidentVehicle',
    fuelType: 'technicalInformation.fuelType',
    driveType: 'technicalInformation.driveType',
    transmission: 'technicalInformation.transmission',
    tires: 'extras.tires',
    season: 'extras.season',
    handicapAccessible: 'extras.handicapAccessible',
    raceCar: 'extras.raceCar',
    tuning: 'extras.tuning',
    metallic: 'colour.metallic',
    city: 'location.city',
    country: 'location.country',
  };

  Object.entries(fieldMap).forEach(([key, path]) => {
    const value = query[key as keyof ServiceFilterQuery];
    if (value !== undefined && value !== null && value !== '') {
      if (['city', 'country'].includes(key)) {
        andConditions.push({ [path]: { $regex: value, $options: 'i' } });
      } else {
        andConditions.push({ [path]: value });
      }
    }
  });

  // 5. Partial Text Matches
  const partialFields = {
    'basicInformation.vehicleName': vehicleName,
    'basicInformation.vinNo': vinNo,
    'colour.exterior': exterior,
    'colour.interior': interior,
    'technicalInformation.engineType': engineType,
    'technicalInformation.performance': performance,
  };

  Object.entries(partialFields).forEach(([path, value]) => {
    if (value) {
      andConditions.push({ [path]: { $regex: value, $options: 'i' } });
    }
  });

  // 6. Equipment Boolean Filters
  const equipmentKeys = [
    'ABS',
    'Camera',
    'AdaptiveCruiseControl',
    'AlarmSystem',
    'ElectricSeatAdjustment',
    'Towbar',
    'LeatherAlcantaraFabricSeats',
    'HeatedVentilatedSeats',
    'SunroofPanoramicRoof',
    'AndroidAuto',
    'NavigationSystem',
    'ParkingSensors',
    'HeadUpDisplay',
    'XenonLEDHeadlights',
    'KeylessEntryStart',
    'Isofix',
    'StartStopSystem',
    'TheftProtection',
    'ClimateControl',
    'SportsSeats',
    'SpeedLimiter',
    'StabilityControlESP',
    'SoundSystem',
  ];

  equipmentKeys.forEach((key) => {
    const value = query[key as keyof ServiceFilterQuery];
    if (value !== undefined && value !== null && value !== '') {
      const boolValue = value === 'true';
      if (boolValue) {
        andConditions.push({ [`equipment.${key}`]: true });
      }
    }
  });

  // Final MongoDB Query
  const mongoQuery = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

  // Pagination & Sorting
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute Queries
  const [data, total] = await Promise.all([
    ServiceModelInstance.find(mongoQuery)
      .populate('user', 'name email profile')
      .populate('brand', 'name logo')
      .populate('model', 'name')
      .populate('Category', 'name')
      .populate('createdBy', 'name email profile')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(),

    ServiceModelInstance.countDocuments(mongoQuery),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  const result = {
    success: true,
    message: 'Services fetched successfully',
    data,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
    appliedFilters: query,
  };

  // Caching (safe & efficient)
  try {
    const cacheKey = `${CACHE_PREFIXES.SERVICES}:filter:${JSON.stringify({
      ...query,
      page: undefined,
      limit: undefined,
    })}`;

    const ttl = Object.keys(query).length > 6 ? CACHE_TTL.SHORT : CACHE_TTL.MEDIUM;
    await RedisCacheService.set(cacheKey, result, { ttl });
  } catch (error) {
    console.warn('Redis cache failed (non-critical):', error);
  }

  return result;
};

//compare
const compareTwoServicesFromDB = async(id1: string, id2: string) => {
    const car1 = await ServiceModelInstance.findById(id1);
    const car2 = await ServiceModelInstance.findById(id2);

    if (!car1 || !car2) {
      throw new Error("One or both cars not found");
    }

    return {
      car1,
      car2,
      comparison: {
        priceDifference: Math.abs(car1.basicInformation?.price - car2.basicInformation?.price),
        mileageDifference: Math.abs(car1.basicInformation?.miles ?? 0 - (car2.basicInformation?.miles ?? 0)),
        yearDifference: Math.abs(car1.basicInformation?.year ?? 0 - (car2.basicInformation?.year ?? 0)),
      },
    };
  }
// Optional: Get single service by ID
export const getServiceByIdFromDB = async (id: string) => {
  const cacheKey = `${CACHE_PREFIXES.SERVICES}:id:${id}`;
  const cached = await RedisCacheService.get(cacheKey);

  if (cached) return cached;

  const service = await ServiceModelInstance.findById(id)
    .populate('user', 'name email profile')
    .populate('basicInformation.brand', 'brand logo')  // <-- dot notation
    .populate('basicInformation.model', 'model')
    // .populate('Category', 'name')
    .populate('createdBy', 'name email profile')
    .lean();

  if (service) {
    await RedisCacheService.set(cacheKey, service, { ttl: CACHE_TTL.LONG });
  }

  return service;
};



const getSingleServiceFromDB = async (id: string): Promise<IService> => {
  // Validate ObjectId
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  const service = await ServiceModelInstance
    .findOne({ _id: id, isDeleted: false })
    .populate('user', 'name email')
    // .populate('assignedUsers', 'name email')
.populate('basicInformation.brand', 'brand logo')  // <-- dot notation
  .populate('basicInformation.model', 'model')
    .populate('createdBy', 'name email')
    .lean()

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
  }

  return service as IService
}

//helper color
const removeConflictingMongoPaths = (data: any) => {
  const keys = Object.keys(data);

  for (let key of keys) {
    for (let otherKey of keys) {
      if (key !== otherKey && otherKey.startsWith(key + ".")) {
        delete data[key];
      }
    }
  }

  return data;
};

const updateServiceInDB = async (
  id: string,
  payload: any,
  files?: { [fieldname: string]: Express.Multer.File[] }
): Promise<IService> => {

  if (!Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID');

  let parsedData = parseFormData(payload, files);

  // Remove non-editable fields
  delete parsedData._id;
  delete parsedData.createdAt;
  delete parsedData.createdBy;
  delete parsedData.isDeleted;

  // Convert brand/model to ObjectId if present
  if (parsedData.basicInformation?.brand) {
    parsedData.basicInformation.brand = new Types.ObjectId(parsedData.basicInformation.brand);
  }
  if (parsedData.basicInformation?.model) {
    parsedData.basicInformation.model = new Types.ObjectId(parsedData.basicInformation.model);
  }

  const service = await ServiceModelInstance.findById(id);
  if (!service) throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');

  // Merge new files
  if (files) {
    Object.keys(files).forEach((field) => {
      const filePaths = files[field].map(f => `/uploads/${f.filename}`);
      if (field.includes('basicInformation')) {
        const name = field.match(/\[(\w+)\]/)?.[1] || 'productImage';
        service.basicInformation = service.basicInformation || {};
        (service.basicInformation as any)[name] = filePaths;
      } else {
        (service as any)[field] = filePaths;
      }
    });
  }

  // Merge other parsedData
  Object.assign(service, parsedData);

  await service.save();

  await service.populate([
    { path: 'basicInformation.brand', select: 'brand image' },
    { path: 'basicInformation.model', select: 'model brand' },
    { path: 'createdBy', select: 'name email' }
  ]);

  return service;
};
const updateServiceMilesInDB = async (id: string, miles: number) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  if (miles === undefined || miles < 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Valid miles value is required')
  }

  const service = await ServiceModelInstance.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { miles: Number(miles) } },
    { new: true }
  ).select('miles totalMiles')

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
  }

  return {
    miles: service.miles,
    totalMiles: service.totalMiles
  }
}

// const deleteServiceFromDB = async (id: string): Promise<void> => {
//   if (!Types.ObjectId.isValid(id)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
//   }

//   const service = await ServiceModelInstance.findOneAndUpdate(
//     { _id: id, isDeleted: false },
//     { $set: { isDeleted: true } },
//     { new: true }
//   )

//   if (!service) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
//   }
// }
const deleteServiceFromDB = async (
  req: Request,
  serviceId: string
): Promise<IService> => {
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }

  const service = await ServiceModelInstance.findById(serviceId);
  
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  if (service.createdBy.toString() !== userId.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to delete this service'
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const deletedService = await ServiceModelInstance.findByIdAndDelete(serviceId);
  
  if (!deletedService) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete service');
  }

  if (user.role === USER_ROLES.SELLER && user.isSubscribed) {
    try {
      const result = await CarManagementService.removeCarFromSubscription({
        id: userId,
        role: user.role
      });
      
      console.log('Car count reduced after service deletion:', result);
      
      if (result.adHocCars >= 0 && result.adHocCharges > 0) {
        console.log(
          `Ad-hoc charges updated: $${result.adHocCharges} for ${result.adHocCars} additional car(s)`
        );
      }
    } catch (error: any) {

      console.error('Failed to reduce car count after deletion:', error.message);
      
    }
  }

  return deletedService;
};
const permanentDeleteServiceFromDB = async (id: string): Promise<void> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  const service = await ServiceModelInstance.findByIdAndDelete(id)

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
  }
}

const restoreServiceInDB = async (id: string): Promise<IService> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  const service = await ServiceModelInstance.findOneAndUpdate(
    { _id: id, isDeleted: true },
    { $set: { isDeleted: false } },
    { new: true }
  )

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found or already active')
  }

  return service
}

const assignUsersToService = async (id: string, userIds: string[]): Promise<IService> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'userIds must be a non-empty array')
  }

  // Validate all user IDs
  const validUserIds = userIds.filter(uid => Types.ObjectId.isValid(uid))
  if (validUserIds.length !== userIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'One or more invalid user IDs')
  }

  const service = await ServiceModelInstance.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $addToSet: { assignedUsers: { $each: validUserIds } } },
    { new: true }
  ).populate('assignedUsers', 'name email')

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
  }

  return service
}

const getServiceStatsFromDB = async () => {
  const stats = await ServiceModelInstance.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        totalMiles: { $sum: '$totalMiles' },
        averageMiles: { $avg: '$totalMiles' }
      }
    },
    {
      $project: {
        _id: 0,
        totalServices: 1,
        totalMiles: 1,
        averageMiles: { $round: ['$averageMiles', 2] }
      }
    }
  ])

  // Count by status
  const statusCounts = await ServiceModelInstance.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ])

  return {
    summary: stats[0] || {},
    byStatus: statusCounts
  }
}

const createCarCompareIntoDB = async (carId: string,user:JwtPayload) => {
  const compareAmount = await CareCompareModelInstance.countDocuments({user:user.id});
  if(compareAmount >=4){
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You can compare maximum 4 cars');
  }
  const isExist = await CareCompareModelInstance.findOne({user:user.id,car:carId});
  if(isExist){
    return isExist;
  }

  
  const result = await CareCompareModelInstance.create({user:user.id,car:carId});
  return result
}


const getCarCompareFromDB = async (userId: string) => {
  const result = await CareCompareModelInstance.find({ user: userId })
    .populate({
      path: 'car',
      populate: [
        { path: 'basicInformation.brand', select: 'brand logo' },
        { path: 'basicInformation.model', select: 'model' }
      ]
    })
    .lean();

  // Return just the populated cars
  return result.map(item => item.car);
};


const deleteCarCompareFromDB = async (compareId:string,userId:string) => {
  const result = await CareCompareModelInstance.findOneAndDelete({user:userId,car:compareId});
  return result
}

const ServiceService = {
  createServiceToDB,
  getAllServicesFromDB,
  getSingleServiceFromDB,
  updateServiceInDB,
  updateServiceMilesInDB,
  deleteServiceFromDB,
  permanentDeleteServiceFromDB,
  restoreServiceInDB,
  assignUsersToService,
  getServiceStatsFromDB,
  getAllFilterFromDB,
  getAllServicesFromDBFilter,
  compareTwoServicesFromDB,
  createCarCompareIntoDB,
  getCarCompareFromDB,
  deleteCarCompareFromDB
}

export default ServiceService
