import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { CarModelService } from './models.service'

const createcarModels = catchAsync(async (req: Request, res: Response) => {
    const categoryData = req.body;
    const result = await CarModelService.createModelTDB(categoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'carModels create successfully',
        data: result
    })
})

const getcarModels = catchAsync(async (req: Request, res: Response) => {
    const result = await CarModelService.getmodelFromDb();

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'carModels retrieved successfully',
        data: result
    })
})

const updatecarModels = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const updateCategoryData = req.body;
    const result = await CarModelService.updateModelToDB(id, updateCategoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'carModels updated successfully',
        data: result
    })
})

const deletecarModels = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const result = await CarModelService.deleteModelToDB(id)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'carModels delete successfully',
        data: result
    })
})

const bulkUpload = catchAsync(async (req, res) => {
  if (!req.file) throw new Error("Excel file not provided");

  const result = await CarModelService.bulkUpload(req.file.buffer);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Car models uploaded successfully",
    data: result,
  });
});


export const carModelsController = {
    createcarModels,
    getcarModels,
    updatecarModels,
    deletecarModels,
    bulkUpload
}
