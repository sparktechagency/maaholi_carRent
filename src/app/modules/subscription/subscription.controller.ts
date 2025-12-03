import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SubscriptionService } from "./subscription.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import ApiError from '../../../errors/ApiError';

/**
 * Get user's subscription details
 */
const getMySubscription = catchAsync(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const result = await SubscriptionService.subscriptionDetailsFromDB(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Subscription details retrieved successfully',
        data: result
    });
});

/**
 * Get all subscriptions (Admin only)
 */

const getAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionService.getAllSubscriptionsFromDB(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'All subscriptions retrieved successfully',
        data: result
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
        message: 'Subscription details retrieved successfully',
        data: result
    });
});

/**
 * Get user's subscription history
 */
const getMySubscriptionHistory = catchAsync(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const result = await SubscriptionService.getSubscriptionHistoryFromDB(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Subscription history retrieved successfully',
        data: result
    });
});

/**
 * Get subscription stats for dashboard
 */
const getMySubscriptionStats = catchAsync(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const result = await SubscriptionService.getSubscriptionStatsFromDB(user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.hasActiveSubscription 
            ? 'Subscription statistics retrieved successfully'
            : 'No active subscription found',
        data: result
    });
});

/**
 * Customize subscription (DEALER only)
 */
const customizeMySubscription = catchAsync(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { customCarLimit } = req.body;

    // Validate input
    if (!customCarLimit || typeof customCarLimit !== 'number' || customCarLimit < 1) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            'Valid customCarLimit is required'
        );
    }


    const result = await SubscriptionService.customizeSubscriptionInDB(
        user,
        customCarLimit,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: result.details
    });
});

export const SubscriptionController = {
    getMySubscription,
    getAllSubscriptions,
    getSubscriptionById,
    getMySubscriptionHistory,
    getMySubscriptionStats,
    customizeMySubscription
};


// const subscriptionDetails = catchAsync( async(req: Request, res: Response)=>{
//     const result = await SubscriptionService.subscriptionDetailsFromDB(req.user);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Subscription Details Retrieved Successfully",
//         data: result.subscription
//     })
// });


// const getAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
//     const result = await SubscriptionService.getAllSubscriptionsFromDB(req.query);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "All subscriptions retrieved successfully",
//         data: result.subscriptions,
    
//     });
// });


// const getSubscriptionById = catchAsync(async (req: Request, res: Response) => {
//     const { id } = req.params;
//     const result = await SubscriptionService.getSubscriptionByIdFromDB(id);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Subscription retrieved successfully",
//         data: result
//     });
// });


// const getSubscriptionHistory = catchAsync(async (req: Request, res: Response) => {
//     const user = req.user;
//     const result = await SubscriptionService.getSubscriptionHistoryFromDB(user);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Subscription history retrieved successfully",
//         data: result
//     });
// });


// const getSubscriptionStats = catchAsync(async (req: Request, res: Response) => {
//     const user = req.user;
//     const result = await SubscriptionService.getSubscriptionStatsFromDB(user);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: result.hasActiveSubscription 
//             ? "Subscription statistics retrieved successfully" 
//             : result.message!,
//         data: result
//     });
// });

// export const SubscriptionController = {
//     subscriptionDetails,
//     getAllSubscriptions,
//     getSubscriptionById,
//     getSubscriptionHistory,
//     getSubscriptionStats
// }