import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { PaymentService } from "./payment.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";


const createPaymentCheckoutToStripe = catchAsync(async(req: Request, res: Response)=>{
    const payload = req.body;
    const result = await PaymentService.createPaymentCheckoutToStripe(req.user, payload);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Payment Intent Created Successfully",
        data: result
    })
});

const createAccountToStripe = catchAsync(async(req: Request, res: Response)=>{
    const result = await PaymentService.createAccountToStripe(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Connected account created successfully",
        data: result
    })
});


const createSubscriptionCheckout = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { packageId } = req.body;

    if (!packageId) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: "Package ID is required",
            data: null
        });
    }

    const result = await PaymentService.createSubscriptionCheckoutToStripe(user, packageId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subscription checkout created successfully",
        data: { checkoutUrl: result }
    });
});

const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const result = await PaymentService.cancelSubscriptionFromStripe(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: null
    });
});
export const PaymentController = {
    createPaymentCheckoutToStripe,
    createAccountToStripe,
    createSubscriptionCheckout,
    cancelSubscription
}