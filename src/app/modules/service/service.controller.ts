import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import ServiceService from './service.service'
import sendResponse from '../../../shared/sendResponse'
import { ServiceHelpers } from '../car_Management/helper'


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
    message: 'car created successfully',
    data: result
  })
})

const checkCanAddCar = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceHelpers.checkCarAddPermission(req);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result
  });
});

const getCarStatistics = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceHelpers.getSellerCarStatistics(req);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Car statistics retrieved successfully',
    data: result
  });
});

const getAllServices = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const query = req.query

  const result = await ServiceService.getAllServicesFromDB(query)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'car retrieved successfully',
    data: result.data,
  })
})

const getAllFilter = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const requestData = req.query; 
  const result = await ServiceService.getAllServicesFromDBFilter(requestData);
  
sendResponse(res, {
  success: true,
  statusCode: StatusCodes.OK,
  message: result.data.length > 0 
    ? 'Services retrieved successfully' 
    : 'No services found matching the filters',
  data: result.data,
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

  await ServiceService.deleteServiceFromDB(req, id)

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


const getServiceStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await ServiceService.getServiceStatsFromDB()

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service statistics retrieved successfully',
    data: result
  })
})

 const compareTwoServices = catchAsync(async (req: Request, res: Response) => {
  const { id1, id2 } = req.params;

  const result = await ServiceService.compareTwoServicesFromDB(id1, id2);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Comparison data retrieved successfully",
    data: result,
  });
});


const createCarCompare = catchAsync(async (req: Request, res: Response) => {
  const { carId} = req.body;

  
  const user = req.user;
  const result = await ServiceService.createCarCompareIntoDB(carId, user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Car compare created successfully",
    data: result,
  });
});

const getCarCompare = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await ServiceService.getCarCompareFromDB(user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Car statistics retrieved successfully",
    data: result,
  });
});

const deleteCarCompare = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const result = await ServiceService.deleteCarCompareFromDB(id, user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Car compare deleted successfully",
    data: result,
  });
});

const getSelfAddedCarDetails = catchAsync(async (req: Request, res: Response) => {  
  const user = req.user;
  const result = await ServiceService.getSelfAddedCarDetailsFromDB(user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Car details retrieved successfully",
    data: result,
  });
});

const getCarByBrandId = catchAsync(async (req: Request, res: Response) => {  
  const { brandId } = req.params;
  const result = await ServiceService.getcarBybrandIdFromDB(brandId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Car details retrieved successfully",
    data: result,
  });
});

const getPriceRangeCounts = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceService.getPriceRangeCounts();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Price range counts retrieved successfully',
    data: result,
  });
})

const getYearlyCarModelStats = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceService.getYearlyCarModelStatsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'car model Year statistics retrieved successfully',
    data: result
  })
});

export const ServiceController = {
  createService,
  checkCanAddCar,
  getCarStatistics,
  getCarByBrandId,
  getAllServices,
  getSingleService,
  updateService,
  updateServiceMiles,
  deleteService,
  permanentDeleteService,
  restoreService,
  getServiceStats,
  getAllFilter,
  compareTwoServices,
  createCarCompare,
  getCarCompare,
  deleteCarCompare,
  getSelfAddedCarDetails,
  getPriceRangeCounts,
  getYearlyCarModelStats
}
