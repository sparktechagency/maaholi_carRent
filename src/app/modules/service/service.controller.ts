import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import ServiceService from './service.service'
import sendResponse from '../../../shared/sendResponse'


const createService = catchAsync(async(req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] }
  const serviceData = req.body

  console.log('=== CREATE SERVICE DEBUG ===')
  console.log('Body:', JSON.stringify(serviceData, null, 2))
  console.log('Files:', files ? Object.keys(files) : 'No files')
  console.log('User:', req.user)

  const result = await ServiceService.createServiceToDB(req, serviceData, files)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Service created successfully',
    data: result
  })
})


const getAllServices = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const query = req.query

  const result = await ServiceService.getAllServicesFromDB(query)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Services retrieved successfully',
    data: result.data,
  })
})

const getAllFilter = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const requestData = req.body; // Changed from req.query to req.body
  const result = await ServiceService.getAllFilterFromDB(requestData);
  
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.data.length > 0 
      ? 'Services retrieved successfully' 
      : 'No services found matching the filters',
    data: result.data,
    meta: result.meta,
  });
});

const getSingleService = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params

  const result = await ServiceService.getSingleServiceFromDB(id)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service retrieved successfully',
    data: result
  })
})


const updateService = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params
  const files = req.files as { [fieldname: string]: Express.Multer.File[] }
  const updateData = req.body

  const result = await ServiceService.updateServiceInDB(id, updateData, files)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service updated successfully',
    data: result
  })
})


const updateServiceMiles = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params
  const { miles } = req.body

  const result = await ServiceService.updateServiceMilesInDB(id, miles)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service miles updated successfully',
    data: result
  })
})

const deleteService = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params

  await ServiceService.deleteServiceFromDB(id)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service deleted successfully'
  })
})

const permanentDeleteService = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params

  await ServiceService.permanentDeleteServiceFromDB(id)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service permanently deleted'
  })
})

const restoreService = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params

  const result = await ServiceService.restoreServiceInDB(id)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service restored successfully',
    data: result
  })
})

const assignUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params
  const { userIds } = req.body

  const result = await ServiceService.assignUsersToService(id, userIds)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Users assigned successfully',
    data: result
  })
})

const getServiceStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await ServiceService.getServiceStatsFromDB()

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service statistics retrieved successfully',
    data: result
  })
})

export const ServiceController = {
  createService,
  getAllServices,
  getSingleService,
  updateService,
  updateServiceMiles,
  deleteService,
  permanentDeleteService,
  restoreService,
  assignUsers,
  getServiceStats,
  getAllFilter
}