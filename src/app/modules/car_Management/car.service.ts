import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { Subscription } from "../subscription/subscription.model";
import { Package } from "../package/package.model";
import { User } from "../user/user.model";
import stripe from "../../../config/stripe";
import { USER_ROLES } from "../../../enums/user";

interface ICarAddResponse {
    success: boolean;
    message: string;
    carsAdded: number;
    carLimit: number;
    adHocCars: number;
    adHocCharges: number;
    totalCost: number;
}

const checkCarLimitAndAddCar = async (
    user: JwtPayload
): Promise<ICarAddResponse> => {
    // Check if user is a SELLER
    const userData = await User.findById(user.id);
    if (!userData || userData.role !== USER_ROLES.SELLER) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            "Only sellers can add cars"
        );
    }

    // Check if user has an active subscription
    if (!userData.isSubscribed) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "You need an active subscription to add cars"
        );
    }

    // Get subscription details with package info
    const subscription = await Subscription.findOne({
        user: user.id,
        status: "active"
    }).populate("package");

    if (!subscription) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            "No active subscription found"
        );
    }

    const packageData: any = subscription.package;
    const carLimit = packageData.carLimit || 4;
    const currentCarsAdded = subscription.carsAdded || 0;

    // Check if within package limit
    if (currentCarsAdded < carLimit) {
        // Add car within package limit (free)
        subscription.carsAdded = currentCarsAdded + 1;
        await subscription.save();

        return {
            success: true,
            message: "Car added successfully within package limit",
            carsAdded: subscription.carsAdded,
            carLimit: carLimit,
            adHocCars: subscription.adHocCars,
            adHocCharges: subscription.adHocCharges,
            totalCost: subscription.price
        };
    } else {
        // Exceeded package limit - charge ad-hoc price
        const adHocPrice = packageData.adHocPricePerCar || 2.5;
        const newAdHocCars = (subscription.adHocCars || 0) + 1;
        const newAdHocCharges = (subscription.adHocCharges || 0) + adHocPrice;

        // Create a one-time invoice item for the additional car
        try {
            await stripe.invoiceItems.create({
                customer: subscription.customerId,
                amount: Math.round(adHocPrice * 100), // Convert to cents
                currency: "usd",
                description: `Additional car #${newAdHocCars} - Ad-hoc charge`,
                subscription: subscription.subscriptionId
            });

            // Update subscription
            subscription.carsAdded = currentCarsAdded + 1;
            subscription.adHocCars = newAdHocCars;
            subscription.adHocCharges = newAdHocCharges;
            await subscription.save();

            return {
                success: true,
                message: `Car added with ad-hoc charge of $${adHocPrice}`,
                carsAdded: subscription.carsAdded,
                carLimit: carLimit,
                adHocCars: subscription.adHocCars,
                adHocCharges: subscription.adHocCharges,
                totalCost: subscription.price + subscription.adHocCharges
            };
        } catch (error: any) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Failed to process ad-hoc payment: ${error.message}`
            );
        }
    }
};

const removeCarFromSubscription = async (
    user: JwtPayload
): Promise<ICarAddResponse> => {
    const userData = await User.findById(user.id);
    if (!userData || userData.role !== USER_ROLES.SELLER) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            "Only sellers can remove cars"
        );
    }

    const subscription = await Subscription.findOne({
        user: user.id,
        status: "active"
    }).populate("package");

    if (!subscription) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            "No active subscription found"
        );
    }

    if (subscription.carsAdded <= 0) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "No cars to remove"
        );
    }

    const packageData: any = subscription.package;
    const carLimit = packageData.carLimit || 4;

    // If removing an ad-hoc car
    if (subscription.carsAdded > carLimit && subscription.adHocCars > 0) {
        const adHocPrice = packageData.adHocPricePerCar || 2.5;
        subscription.adHocCars = subscription.adHocCars - 1;
        subscription.adHocCharges = subscription.adHocCharges - adHocPrice;
    }

    subscription.carsAdded = subscription.carsAdded - 1;
    await subscription.save();

    return {
        success: true,
        message: "Car removed successfully",
        carsAdded: subscription.carsAdded,
        carLimit: carLimit,
        adHocCars: subscription.adHocCars,
        adHocCharges: subscription.adHocCharges,
        totalCost: subscription.price + subscription.adHocCharges
    };
};

const getCarLimitStatus = async (user: JwtPayload) => {
    const userData = await User.findById(user.id);
    if (!userData || userData.role !== USER_ROLES.SELLER) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            "Only sellers can check car limits"
        );
    }

    const subscription = await Subscription.findOne({
        user: user.id,
        status: "active"
    }).populate("package");

    if (!subscription) {
        return {
            hasSubscription: false,
            carsAdded: 0,
            carLimit: 0,
            adHocCars: 0,
            adHocCharges: 0,
            canAddMore: false
        };
    }

    const packageData: any = subscription.package;
    const carLimit = packageData.carLimit || 4;

    return {
        hasSubscription: true,
        carsAdded: subscription.carsAdded,
        carLimit: carLimit,
        adHocCars: subscription.adHocCars,
        adHocCharges: subscription.adHocCharges,
        adHocPricePerCar: packageData.adHocPricePerCar,
        remainingFreeSlots: Math.max(0, carLimit - subscription.carsAdded),
        canAddMore: true,
        totalCost: subscription.price + subscription.adHocCharges
    };
};

export const CarManagementService = { 
    checkCarLimitAndAddCar,
    removeCarFromSubscription,
    getCarLimitStatus
};