import e, { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReservationService } from "./reservation.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";

const createReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.createReservationToDB(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "car test drive booking successfully",
        data: reservation
    })
}); 

const sellerReservation = catchAsync(async (req: Request, res: Response) => {
    const result = await ReservationService.sellerReservationFromDB(req.user, req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "test-drive reservation retrieved successfully",
        data: result.data,
        // pagination: result.meta
    })
}); 

const buyerReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.BuyerReservationFromDB(req.user, req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 


const reservationSummerForSeller = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.reservationSummerForSellerFromDB(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 

const reservationDetails = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.reservationDetailsFromDB(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Details retrieved successfully",
        data: reservation
    })
}); 

const respondedReservation = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.respondedReservationFromDB(req.params.id, req.query.status as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Updated  successfully",
        data: reservation
    })
}); 


const cancelReservation = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.cancelReservationFromDB(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Cancelled. You have been refunded within 24 hours",
        data: reservation
    })
}); 


const confirmReservation = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.confirmReservationFromDB(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Confirm",
        data: reservation
    })
}); 

export const ReservationController = {
    createReservation,
    sellerReservation,
    buyerReservation,
    reservationSummerForSeller,
    reservationDetails,
    respondedReservation,
    cancelReservation,
    confirmReservation
}