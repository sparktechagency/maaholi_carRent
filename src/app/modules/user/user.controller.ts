import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserService } from './user.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { config } from 'dotenv';
import ApiError from '../../../errors/ApiError';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { User } from './user.model';

// register user
const createUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    await UserService.createUserToDB(userData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Please check your email verify your account. We have sent you an OTP to complete the registration process.',
    })
});

//role-switch
 const switchRole = catchAsync(async (req, res) => {
  const userId = req.user?.id;

  const result = await UserService.switchRoleService(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Role switched successfully",
    data: result,
  });
});

// register admin
const createAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createAdminToDB(userData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Admin created successfully',
        data: result
    });
});

// retrieved user profile
const getUserProfile = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const result = await UserService.getUserProfileFromDB(user);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Profile data retrieved successfully',
        data: result
    });
});


const updateProfile = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;

    let profile: string | undefined;

    if (req.files && "image" in req.files && Array.isArray(req.files.image) && req.files.image[0]) {
        profile = `/images/${req.files.image[0].filename}`;
    }

    let parsedLocation = undefined;
    if (req.body.location) {
        try {
            parsedLocation = JSON.parse(req.body.location);
        } catch (e) {
            console.log("Invalid location JSON:", req.body.location);
        }
    }

    const data: any = {
        ...req.body,
        ...(profile && { profile }),     
        ...(parsedLocation && { location: parsedLocation }),
    };

    delete data.image; 

    const result = await UserService.updateProfileToDB(user, data);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Profile updated successfully",
        data: result,
    });
});

const updateLocation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const payload = {
        longitude: Number(req.body.longitude),
        latitude: Number(req.body.latitude)
    }
    const result = await UserService.updateLocationToDB(user, payload);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'User Location Updated successfully',
        data: result
    });
});

const toggleUserLock = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updatedUser = await UserService.toggleUserLock(id);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: `User ${updatedUser.isLocked ? "locked" : "unlocked"} successfully`,
            data: updatedUser
        });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || "Something went wrong"
        });
    }
};


//dealer
const getDealerCompleteProfile = catchAsync(async (req: Request, res: Response) => {
  const dealerId = req.params.dealerId || (req as any).user?.id;

  const result = await UserService.getDealerCompleteProfile(dealerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dealer profile retrieved successfully',
    data: result
  });
});

/**
 * Get DEALER's car inventory with filters
 */
const getDealerCarInventory = catchAsync(async (req: Request, res: Response) => {
  const dealerId = req.params.dealerId || (req as any).user?.id;

  const result = await UserService.getDealerCarInventory(dealerId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Car inventory retrieved successfully',
    data: result.cars
  });
});

/**
 * Get DEALER's subscription history
 */
const getDealerSubscriptionHistory = catchAsync(async (req: Request, res: Response) => {
  const dealerId = req.params.dealerId || (req as any).user?.id;

  const result = await UserService.getDealerSubscriptionHistory(dealerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Subscription history retrieved successfully',
    data: result
  });
});

/**
 * Get DEALER dashboard overview (quick stats)
 */
const getDealerDashboard = catchAsync(async (req: Request, res: Response) => {
  const dealerId = (req as any).user?.id;

  const result = await UserService.getDealerDashboard(dealerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dashboard data retrieved successfully',
    data: result
  });
});

/**
 * Get own profile (for logged-in DEALER)
 */
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const dealerId = (req as any).user?.id;

  const result = await UserService.getDealerCompleteProfile(dealerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Your profile retrieved successfully',
    data: result
  });
});



export const UserController = {
    createUser,
    createAdmin,
    getUserProfile,
    updateProfile,
    updateLocation,
    switchRole,
    toggleUserLock,
    getDealerCompleteProfile,
    getDealerCarInventory,
    getDealerSubscriptionHistory,
    getDealerDashboard,
    getMyProfile
};