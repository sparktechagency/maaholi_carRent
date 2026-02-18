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
  payload: IService,
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

  const transformedServices = services.map((service: any) => {
    const productImages = service.basicInformation?.productImage || [];
    
    return {
      ...service,
      featuredImage: productImages.length > 0 ? productImages[0] : null,
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
  } = requestData; 

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const ensureArray = (val: any) => Array.isArray(val) ? val : [val];
  
  const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  };
  
  const searchQuery: any = { isDeleted: false };

  if (search && search.trim()) {
    searchQuery.$or = [
      { 'basicInformation.vehicleName': { $regex: search, $options: 'i' } },
      { 'basicInformation.vinNo': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } },
    ];
  }

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

    if (priceRange && Array.isArray(priceRange) && priceRange.length === 2) {
      const [min, max] = priceRange;
      if (min != null && max != null) {
        searchQuery['basicInformation.RegularPrice'] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }
    }
    if (yearRange && Array.isArray(yearRange) && yearRange.length === 2) {
      const [min, max] = yearRange;
      if (min != null && max != null) {
        searchQuery['basicInformation.year'] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }
    }

    if (mileageRange && Array.isArray(mileageRange) && mileageRange.length === 2) {
      const [min, max] = mileageRange;
      if (min != null && max != null) {
        searchQuery['basicInformation.miles'] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      }
    }

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

    if (numberOfSeats) {
      searchQuery['seatsAndDoors.seats'] = { $in: ensureArray(numberOfSeats).map(Number) };
    }

    if (numberOfDoors) {
      searchQuery['seatsAndDoors.doors'] = { $in: ensureArray(numberOfDoors).map(Number) };
    }

    if (fuelConsumption) {
      searchQuery['energyAndEnvironment.fuelConsumption'] = { $regex: fuelConsumption, $options: 'i' };
    }

    if (energyEfficiencyClass) {
      searchQuery['energyAndEnvironment.energyEfficiencyClass'] = { $in: ensureArray(energyEfficiencyClass) };
    }

    if (country) {
      searchQuery['location.country'] = { $regex: country, $options: 'i' };
    }

    if (city) {
      searchQuery['location.city'] = { $regex: city, $options: 'i' };
    }

    if (equipment && Array.isArray(equipment) && equipment.length > 0) {
      equipment.forEach((equipmentItem: string) => {
        searchQuery[`equipment.${equipmentItem}`] = true;
      });
    }
  }

  console.log('MongoDB Query:', JSON.stringify(searchQuery, null, 2));

  const populateOptions: any = [
    { path: 'basicInformation.brand', select: 'brand' },
    { path: 'basicInformation.model', select: 'model' },
    { path: 'user', select: 'name email' },
    { path: 'createdBy', select: 'name email' }
  ];


  if (filters?.brandName) {
    populateOptions[0].match = { brand: { $in: ensureArray(filters.brandName) } };
  }
  if (filters?.modelName) {
    populateOptions[1].match = { model: { $in: ensureArray(filters.modelName) } };
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

  const andConditions: any[] = [{ isDeleted: false }];

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

  const fieldMap: Record<string, string> = {
    brand: 'basicInformation.brand',
    model: 'basicInformation.model',
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

  const mongoQuery = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [data, total] = await Promise.all([
    ServiceModelInstance.find(mongoQuery)
      .populate('user', 'name email profile')
      .populate('basicInformation.brand', 'brand logo')
      .populate('basicInformation.model', 'model logo')
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
export const getServiceByIdFromDB = async (id: string) => {
  const cacheKey = `${CACHE_PREFIXES.SERVICES}:id:${id}`;
  const cached = await RedisCacheService.get(cacheKey);

  if (cached) return cached;

  const service = await ServiceModelInstance.findById(id)
    .populate('user', 'name email profile')
    .populate('basicInformation.brand', 'brand logo') 
    .populate('basicInformation.model', 'model')
    .populate('createdBy', 'name email profile')
    .lean();

  if (service) {
    await RedisCacheService.set(cacheKey, service, { ttl: CACHE_TTL.LONG });
  }

  return service;
};



const getSingleServiceFromDB = async (id: string): Promise<IService> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  const service = await ServiceModelInstance
    .findOne({ _id: id, isDeleted: false })
    .populate('user', 'name email')
.populate('basicInformation.brand', 'brand logo')
  .populate('basicInformation.model', 'model')
    .populate('createdBy', 'name email profile location address')
    .lean()

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
  }

  return service as IService
}


const updateServiceInDB = async (
  id: string,
  payload: any,
  files?: { [fieldname: string]: Express.Multer.File[] }
): Promise<IService> => {

  if (!Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID');

  let parsedData = parseFormData(payload, files);

  delete parsedData._id;
  delete parsedData.createdAt;
  delete parsedData.createdBy;
  delete parsedData.isDeleted;

  if (parsedData.basicInformation?.brand) {
    parsedData.basicInformation.brand = new Types.ObjectId(parsedData.basicInformation.brand);
  }
  if (parsedData.basicInformation?.model) {
    parsedData.basicInformation.model = new Types.ObjectId(parsedData.basicInformation.model);
  }

  const service = await ServiceModelInstance.findById(id);
  if (!service) throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');

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

  return result.map(item => item.car);
};


const deleteCarCompareFromDB = async (compareId:string,userId:string) => {
  const result = await CareCompareModelInstance.findOneAndDelete({user:userId,car:compareId});
  return result
}

const getSelfAddedCarDetailsFromDB = async (user: JwtPayload) => {
  const services = await ServiceModelInstance.find({ createdBy: user.id, isDeleted: false })
    .populate('basicInformation.brand', 'brand logo')
    .populate('basicInformation.model', 'model')
    .lean();
  return services;
}

const getcarBybrandIdFromDB = async (brandId: string) => {
  const result = await ServiceModelInstance.find({ 'basicInformation.brand': brandId, isDeleted: false })
    .populate('basicInformation.brand', 'brand logo')
    .populate('basicInformation.model', 'model')
    .lean();
  return result;
};

const getPriceRangeCounts = async () => {
  const result = await ServiceModelInstance.aggregate([
    { $match: { isDeleted: false } },

    {
      $addFields: {
        finalPrice: {
          $ifNull: ['$basicInformation.OfferPrice', '$basicInformation.RegularPrice'],
        },
      },
    },

    {
      $bucket: {
        groupBy: '$finalPrice',
        boundaries: [
          0,
          10000,
          20000,
          30000,
          40000,
          50000,
          60000,
          70000,
          80000,
          90000,
          100000,
          200000,
          300000,
          400000,
          500000,
          600000,
          700000,
          800000,
          900000,
          1000000
        ],
        default: '1000000+',
        output: {
          count: { $sum: 1 },
        },
      },
    },
  ]);

  return result;
};


const getYearlyCarModelStatsFromDB = async () => {
  const currentYear = new Date().getFullYear();

  const result = await ServiceModelInstance.aggregate([
    {
      $match: {
        isDeleted: false,
        'basicInformation.year': { $gte: 1900, $lte: currentYear },
      },
    },
    {
      $group: {
        _id: '$basicInformation.year',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    count: result.length,
    data: result.map(item => ({
      year: item._id,
      count: item.count,
    })),
    currentYear,
  };
};

const ServiceService = {
  createServiceToDB,
  getAllServicesFromDB,
  getSingleServiceFromDB,
  updateServiceInDB,
  updateServiceMilesInDB,
  deleteServiceFromDB,
  permanentDeleteServiceFromDB,
  restoreServiceInDB,
  getServiceStatsFromDB,
  getAllFilterFromDB,
  getAllServicesFromDBFilter,
  compareTwoServicesFromDB,
  createCarCompareIntoDB,
  getCarCompareFromDB,
  deleteCarCompareFromDB,
  getSelfAddedCarDetailsFromDB,
  getcarBybrandIdFromDB,
  getPriceRangeCounts,
  getYearlyCarModelStatsFromDB
}

export default ServiceService
