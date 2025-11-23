import { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { CarManagementService } from './car.service';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { ServiceModelInstance } from '../service/service.model';

/**
 * Check if user can add more cars and get pricing info
 */
const checkCarAddPermission = async (req: Request) => {
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Only check for SELLERS
  if (user.role !== USER_ROLES.SELLER) {
    return {
      canAdd: true,
      requiresPayment: false,
      message: 'Non-seller users have unlimited car additions',
      userRole: user.role
    };
  }

  // Check if user is subscribed
  if (!user.isSubscribed) {
    return {
      canAdd: false,
      requiresPayment: false,
      message: 'You need an active subscription to add cars. Please subscribe first.',
      subscriptionRequired: true
    };
  }

  try {
    // Get current car status
    const carStatus = await CarManagementService.getCarLimitStatus({
      id: userId,
      role: user.role
    });

    const willExceedLimit = carStatus.remainingFreeSlots === 0;
    const nextCarCost = willExceedLimit ? carStatus.adHocPricePerCar : 0;

    return {
      canAdd: true,
      requiresPayment: willExceedLimit,
      currentCars: carStatus.carsAdded,
      carLimit: carStatus.carLimit,
      remainingFreeSlots: carStatus.remainingFreeSlots,
      adHocCars: carStatus.adHocCars,
      currentAdHocCharges: carStatus.adHocCharges,
      nextCarCost: nextCarCost,
      totalCostAfterAddition: carStatus.totalCost + nextCarCost,
      message: willExceedLimit
        ? `You've reached your package limit. Adding this car will cost an additional $${nextCarCost}/month.`
        : `You can add ${carStatus.remainingFreeSlots} more car(s) for free.`,
      subscriptionRequired: false
    };
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Failed to check car limit: ${error.message}`
    );
  }
};

/**
 * Get user's current service count
 */
const getUserServiceCount = async (userId: string) => {
  const count = await ServiceModelInstance.countDocuments({ createdBy: userId });
  return count;
};

/**
 * Get detailed car statistics for a seller
 */
const getSellerCarStatistics = async (req: Request) => {
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (user.role !== USER_ROLES.SELLER) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only sellers can access car statistics'
    );
  }

  const [carStatus, serviceCount] = await Promise.all([
    CarManagementService.getCarLimitStatus({
      id: userId,
      role: user.role
    }),
    getUserServiceCount(userId)
  ]);

  return {
    subscription: {
      isActive: user.isSubscribed,
      hasSubscription: carStatus.hasSubscription
    },
    cars: {
      total: carStatus.carsAdded,
      limit: carStatus.carLimit,
      free: Math.min(carStatus.carsAdded, carStatus.carLimit),
      adHoc: carStatus.adHocCars,
      remainingFreeSlots: carStatus.remainingFreeSlots
    },
    costs: {
      baseSubscription: carStatus.hasSubscription ? carStatus.totalCost as number - carStatus.adHocCharges : 0,
      adHocCharges: carStatus.adHocCharges,
      adHocPricePerCar: carStatus.adHocPricePerCar,
      totalMonthly: carStatus.totalCost
    },
    services: {
      created: serviceCount
    }
  };
};

export const ServiceHelpers = {
  checkCarAddPermission,
  getUserServiceCount,
  getSellerCarStatistics
};