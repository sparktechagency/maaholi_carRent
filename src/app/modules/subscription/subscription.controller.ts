import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SubscriptionService } from "./subscription.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";

const subscriptionDetails = catchAsync( async(req: Request, res: Response)=>{
    const result = await SubscriptionService.subscriptionDetailsFromDB(req.user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subscription Details Retrieved Successfully",
        data: result.subscription
    })
});

// const getSubscriptionDetails = catchAsync(async (req: Request, res: Response) => {
//     const user = req.user;
//     const result = await SubscriptionService.subscriptionDetailsFromDB(user);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Subscription details retrieved successfully",
//         data: result
//     });
// });

/**
 * Get all subscriptions (Admin only)
 * Query params: status, search, page, limit, sortBy, sortOrder
 */
const getAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionService.getAllSubscriptionsFromDB(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "All subscriptions retrieved successfully",
        data: result.subscriptions,
    
    });
});

/**
 * Get subscription by ID (Admin only)
 */
const getSubscriptionById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await SubscriptionService.getSubscriptionByIdFromDB(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subscription retrieved successfully",
        data: result
    });
});

/**
 * Get user's subscription history
 * Accessible by: SELLER (own history)
 */
const getSubscriptionHistory = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const result = await SubscriptionService.getSubscriptionHistoryFromDB(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subscription history retrieved successfully",
        data: result
    });
});

/**
 * Get subscription statistics for dashboard
 * Accessible by: SELLER (own stats)
 */
const getSubscriptionStats = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const result = await SubscriptionService.getSubscriptionStatsFromDB(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.hasActiveSubscription 
            ? "Subscription statistics retrieved successfully" 
            : result.message!,
        data: result
    });
});

export const SubscriptionController = {
    subscriptionDetails,
    getAllSubscriptions,
    getSubscriptionById,
    getSubscriptionHistory,
    getSubscriptionStats
}