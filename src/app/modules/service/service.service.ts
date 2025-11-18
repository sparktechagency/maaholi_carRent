import { StatusCodes } from 'http-status-codes'
import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose'
import { ServiceModelInstance } from './service.model'
import { IService } from './service.interface'
import ApiError from '../../../errors/ApiError'
import { parseFormData } from '../../../helpers/nestedObject.helper'



// const createServiceToDB = async ( req: Request,
//   payload: any,
//   files?: { [fieldname: string]: Express.Multer.File[] }
// ): Promise<IService> => {
//  const user = req.user.id;
//   const parsedData = parseFormData(payload, files)

//   // Validate required fields
//   if (!user.createdBy) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'createdBy is required')
//   }

//   // Create service
//   const service = await ServiceModelInstance.create(parsedData)
//   if (!service) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create service')
//   }

//   // Populate relationships
//   await service.populate([
//     { path: 'user', select: 'name email' },
//     { path: 'createdBy', select: 'name email' },
//     { path: 'assignedUsers', select: 'name email' }
//   ])

//   return service
// }
const createServiceToDB = async (
  req: Request,
  payload: any,
  files?: { [fieldname: string]: Express.Multer.File[] }
): Promise<IService> => {
  const parsedData = parseFormData(payload, files)
  
  console.log('Parsed Data:', JSON.stringify(parsedData, null, 2))

  const userId = (req as any).user?.id || (req as any).user?._id

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
  }

  // Add createdBy to parsed data
  parsedData.createdBy = userId

  // Create service
  const service = await ServiceModelInstance.create(parsedData)
  if (!service) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create service')
  }

  // Populate relationships
  await service.populate([
    { path: 'user', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
  ])

  return service
}

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
  } = query

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  // Build query
  const searchQuery: any = { isDeleted: false }

  // Search across multiple fields
  if (search) {
    searchQuery.$or = [
      { 'basicInformation.make': { $regex: search, $options: 'i' } },
      { 'basicInformation.model': { $regex: search, $options: 'i' } },
      { 'basicInformation.vin': { $regex: search, $options: 'i' } },
      { 'basicInformation.tagNumber': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } }
    ]
  }

  // Filters
  if (status) searchQuery.status = status
  if (userId) searchQuery.user = new Types.ObjectId(userId as string)
  if (city) searchQuery['location.city'] = { $regex: city, $options: 'i' }
  if (country) searchQuery['location.country'] = { $regex: country, $options: 'i' }

  // Execute query
  const [services, total] = await Promise.all([
    ServiceModelInstance
      .find(searchQuery)
      .populate('user', 'name email')
      // .populate('assignedUsers', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ServiceModelInstance.countDocuments(searchQuery)
  ])

  return {
    data: services,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  }
}

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

const getSingleServiceFromDB = async (id: string): Promise<IService> => {
  // Validate ObjectId
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  const service = await ServiceModelInstance
    .findOne({ _id: id, isDeleted: false })
    .populate('user', 'name email')
    .populate('assignedUsers', 'name email')
    .populate('createdBy', 'name email')
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
  // Validate ObjectId
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  // Parse form data and files
  const parsedData = parseFormData(payload, files)

  // Remove fields that shouldn't be updated
  delete parsedData._id
  delete parsedData.createdAt
  delete parsedData.createdBy
  delete parsedData.isDeleted

  // Update service
  const service = await ServiceModelInstance.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: parsedData },
    { new: true, runValidators: true }
  )
    .populate('user', 'name email')
    .populate('assignedUsers', 'name email')
    .populate('createdBy', 'name email')

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
  }

  return service
}

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

const deleteServiceFromDB = async (id: string): Promise<void> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID')
  }

  const service = await ServiceModelInstance.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  )

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
  }
}

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
  getAllFilterFromDB
}

export default ServiceService




