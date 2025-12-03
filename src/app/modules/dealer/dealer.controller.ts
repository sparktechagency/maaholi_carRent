import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { BarberService } from "./dealer.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { jwtHelper } from "../../../helpers/jwtHelper";
import { Secret } from "jsonwebtoken";
import config from "../../../config";

const getDealerProfile = catchAsync(async (req: Request, res: Response) => {
    const token = req.body.token;
    let user: any;
    if(token) {
        user = jwtHelper.verifyToken(token as string, config.jwt.jwt_secret as Secret);
    }
    const result = await BarberService.getBarberProfileFromDB(user, req.params.id, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "profile found",
        data: result
    });
});

const getBuyerProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await BarberService.getCustomerProfileFromDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Customer profile found",
        data: result
    });
});

const makeDiscount = catchAsync(async (req: Request, res: Response) => {
    const result = await BarberService.makeDiscountToDB(req.user, req.body.discount);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Discount added successfully",
        data: result
    });
});


const DealerDetails = catchAsync(async (req: Request, res: Response) => {
    const result = await BarberService.barberDetailsFromDB(req.user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Recommended data retrieved Successfully",
        data: result
    })
});


export const DealerController = {
    getDealerProfile,
    getBuyerProfile,
    makeDiscount,
    // specialOfferBarber,
    // recommendedBarber,
    // getBarberList,
    DealerDetails
}