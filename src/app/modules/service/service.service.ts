import { StatusCodes } from 'http-status-codes'
import { Request, Response } from 'express';
import { Types } from 'mongoose'
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
  getServiceStatsFromDB
}

export default ServiceService