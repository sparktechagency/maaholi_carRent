import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { IColor } from "./color.interface";
import { ColorService } from "./color.service";


const createColor = catchAsync(async (req: Request, res: Response) => {
    const colorData: IColor = req.body;

    const result = await ColorService.createColorDB(colorData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: 'Color created successfully',
        data: result,
    });
});

const getColors = catchAsync(async (req: Request, res: Response) => {
    const result = await ColorService.getColorsFromDB();

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Colors retrieved successfully',
        data: result,
    });
});

const updateColor = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id;
    const colorData: Partial<IColor> = req.body;

    const result = await ColorService.updateColorToDB(id, colorData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Color updated successfully',
        data: result,
    });
});

const deleteColor = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id;

    const result = await ColorService.deleteColorToDB(id);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Color deleted successfully',
        data: result,
    });
});

export const ColorController = {
    createColor,
    getColors,
    updateColor,
    deleteColor,
};