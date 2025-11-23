import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { CarManagementService } from "./car.service";

const addCar = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    
    const result = await CarManagementService.checkCarLimitAndAddCar(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: result
    });
});

const removeCar = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    
    const result = await CarManagementService.removeCarFromSubscription(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: result
    });
});

const getCarStatus = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    
    const result = await CarManagementService.getCarLimitStatus(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Car limit status retrieved successfully",
        data: result
    });
});

export const CarManagementController = {
    addCar,
    removeCar,
    getCarStatus
};