import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { CarModelService } from './models.service'

const createSubCategory = catchAsync(async (req: Request, res: Response) => {
    const categoryData = req.body;
    const result = await CarModelService.createModelTDB(categoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Models create successfully',
        data: result
    })
})

const getSubCategories = catchAsync(async (req: Request, res: Response) => {
    const result = await CarModelService.getmodelFromDb();

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Sub Category retrieved successfully',
        data: result
    })
})

const updateSubCategory = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const updateCategoryData = req.body;
    const result = await CarModelService.updateModelToDB(id, updateCategoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Sub Category updated successfully',
        data: result
    })
})

const deleteSubCategory = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const result = await CarModelService.deleteModelToDB(id)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Sub Category delete successfully',
        data: result
    })
})


export const SubCategoryController = {
    createSubCategory,
    getSubCategories,
    updateSubCategory,
    deleteSubCategory
}
