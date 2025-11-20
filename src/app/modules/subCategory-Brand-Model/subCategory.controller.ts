import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { BrandService } from './subCategory.service'

const createBrand = catchAsync(async (req: Request, res: Response) => {
    const categoryData = req.body;
    const result = await BrandService.createBrandToDB(categoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'brand create successfully',
        data: result
    })
})

const getBrand = catchAsync(async (req: Request, res: Response) => {
    const result = await BrandService.getBrandsFromDB();

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'brand retrieved successfully',
        data: result
    })
})

const updateBrand = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const updateCategoryData = req.body;
    const result = await BrandService.updateBrandToDB(id, updateCategoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'brand updated successfully',
        data: result
    })
})

const deleteBrand = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const result = await BrandService.deleteBrandToDB(id)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'brand delete successfully',
        data: result
    })
})


export const BrandController = {
    createBrand,
    getBrand,
    updateBrand,
    deleteBrand
}
