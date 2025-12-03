import { JwtPayload } from "jsonwebtoken";
import { ISubscription } from "./subscription.interface";
import { Subscription } from "./subscription.model";
import stripe from "../../../config/stripe";
import { User } from "../user/user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";


const subscriptionDetailsFromDB = async (
    user: JwtPayload
): Promise<{ subscription: ISubscription | {} }> => {
    const subscription = await Subscription.findOne({ user: user.id })
        .populate("package", "title description price duration carLimit adHocPricePerCar feature targetRole allowCustomization")
        .populate("user", "name email profile role")
        .lean();

    if (!subscription) {
        return { subscription: {} };
    }
    try {
        const subscriptionFromStripe = await stripe.subscriptions.retrieve(
            subscription.subscriptionId
        );

        // Check subscription status and update database accordingly
        if (subscriptionFromStripe?.status !== "active") {
            await Promise.all([
                User.findByIdAndUpdate(
                    user.id,
                    { isSubscribed: false },
                    { new: true }
                ),
                Subscription.findOneAndUpdate(
                    { user: user.id },
                    { status: "expired" },
                    { new: true }
                ),
            ]);

            const updatedSubscription = await Subscription.findOne({ user: user.id })
                .populate("package", "title description price duration carLimit adHocPricePerCar feature targetRole allowCustomization")
                .populate("user", "name email profile role")
                .lean();

            return { subscription: updatedSubscription || {} };
        }
    } catch (error: any) {
        console.error("Error syncing with Stripe:", error.message);
    }

    const packageData: any = subscription.package;
    const effectiveCarLimit = (subscription as any).customCarLimit ?? packageData?.carLimit;
    const effectiveAdHocPrice = (subscription as any).customAdHocPrice ?? packageData?.adHocPricePerCar;

    return { 
        subscription: {
            ...subscription,
            effectiveCarLimit,
            effectiveAdHocPrice,
            isCustomized: !!(subscription as any).customCarLimit,
            remainingSlots: Math.max(0, effectiveCarLimit - (subscription.carsAdded || 0))
        }
    };
};


const getAllSubscriptionsFromDB = async (query: any) => {
    const { status, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    // Build filter
    const filter: any = {};
    
    if (status) {
        filter.status = status;
    }

    // Search by user name or email
    if (search) {
        const users = await User.find({
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        }).select('_id');
        
        const userIds = users.map(u => u._id);
        filter.user = { $in: userIds };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get subscriptions
    const subscriptions = await Subscription.find(filter)
        .populate("package", "title description price duration carLimit adHocPricePerCar feature targetRole allowCustomization")
        .populate("user", "name email profile role isSubscribed")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean();

    // Get total count
    const total = await Subscription.countDocuments(filter);

    // Calculate statistics with customization awareness
    const stats = {
        totalSubscriptions: total,
        activeSubscriptions: await Subscription.countDocuments({ status: 'active' }),
        expiredSubscriptions: await Subscription.countDocuments({ status: 'expired' }),
        canceledSubscriptions: await Subscription.countDocuments({ status: 'cancel' }),
        totalBaseRevenue: subscriptions.reduce((sum: number, sub: any) => 
            sum + (sub.totalMonthlyPrice || sub.price), 0
        ),
        totalAdHocRevenue: subscriptions.reduce((sum: number, sub: any) => 
            sum + (sub.adHocCharges || 0), 0
        ),
        totalRevenue: subscriptions.reduce((sum: number, sub: any) => 
            sum + (sub.totalMonthlyPrice || sub.price) + (sub.adHocCharges || 0), 0
        ),
        customizedSubscriptions: subscriptions.filter((sub: any) => sub.customCarLimit).length,
        totalCarsAdded: subscriptions.reduce((sum: number, sub: any) => 
            sum + (sub.carsAdded || 0), 0
        ),
    };

    // Add computed fields to each subscription
    const enhancedSubscriptions = subscriptions.map((sub: any) => {
        const packageData = sub.package;
        const effectiveCarLimit = sub.customCarLimit ?? packageData?.carLimit;
        const effectiveAdHocPrice = packageData?.adHocPricePerCar; // Always package price

        return {
            ...sub,
            effectiveCarLimit,
            effectiveAdHocPrice,
            isCustomized: !!sub.customCarLimit,
            totalCost: (sub.totalMonthlyPrice || sub.price) + (sub.adHocCharges || 0)
        };
    });

    return {
        subscriptions: enhancedSubscriptions,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        },
        stats
    };
};

/**
 * Get subscription by ID (Admin only)
 */
const getSubscriptionByIdFromDB = async (id: string) => {
    if (!id) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Subscription ID is required");
    }

    const subscription = await Subscription.findById(id)
        .populate("package", "title description price duration carLimit adHocPricePerCar feature targetRole allowCustomization")
        .populate("user", "name email profile role isSubscribed mobileNumber address")
        .lean();

    if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Subscription not found");
    }

    // Get Stripe subscription details
    let stripeDetails = null;
    try {
        if (subscription.subscriptionId && subscription.subscriptionId !== 'pending') {
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscriptionId);
            stripeDetails = {
                status: stripeSubscription.status,
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
            };
        }
    } catch (error: any) {
        console.error("Error fetching Stripe details:", error.message);
    }

    // Add computed fields
    const packageData: any = subscription.package;
    const effectiveCarLimit = (subscription as any).customCarLimit ?? packageData?.carLimit;
    const effectiveAdHocPrice = packageData?.adHocPricePerCar; // Always package price

    return {
        subscription: {
            ...subscription,
            effectiveCarLimit,
            effectiveAdHocPrice,
            isCustomized: !!(subscription as any).customCarLimit,
            totalCost: ((subscription as any).totalMonthlyPrice || subscription.price) + (subscription.adHocCharges || 0)
        },
        stripeDetails
    };
};

/**
 * Get user's subscription history (all subscriptions ever purchased)
 */
const getSubscriptionHistoryFromDB = async (user: JwtPayload) => {
    const subscriptions = await Subscription.find({ user: user.id })
        .populate("package", "title description price duration carLimit adHocPricePerCar")
        .sort({ createdAt: -1 })
        .lean();

    const summary = {
        totalSubscriptions: subscriptions.length,
        activeSubscription: subscriptions.find((sub: any) => sub.status === 'active'),
        totalSpent: subscriptions.reduce((sum: number, sub: any) => {
            // Include base price (or customized price) + ad-hoc charges
            const basePrice = sub.totalMonthlyPrice || sub.price;
            return sum + basePrice + (sub.adHocCharges || 0);
        }, 0),
        totalCarsAdded: subscriptions.reduce((sum: number, sub: any) => 
            sum + (sub.carsAdded || 0), 0
        ),
        totalAdHocCars: subscriptions.reduce((sum: number, sub: any) => 
            sum + (sub.adHocCars || 0), 0
        )
    };

    return {
        subscriptions,
        summary
    };
};

/**
 * Get subscription statistics for dashboard
 */
const getSubscriptionStatsFromDB = async (user: JwtPayload) => {
    const subscription = await Subscription.findOne({ 
        user: user.id,
        status: 'active' 
    }).populate("package", "title carLimit adHocPricePerCar duration targetRole allowCustomization");

    if (!subscription) {
        return {
            hasActiveSubscription: false,
            message: "No active subscription found"
        };
    }

    const packageData: any = subscription.package;
    
    // Get effective limits (considers customization)
    const effectiveCarLimit = (subscription as any).customCarLimit ?? packageData.carLimit;
    const effectiveAdHocPrice = (subscription as any).customAdHocPrice ?? packageData.adHocPricePerCar;
    const basePrice = (subscription as any).totalMonthlyPrice ?? subscription.price;
    
    const carsUsedInPackage = Math.min(subscription.carsAdded, effectiveCarLimit);
    const additionalCars = Math.max(0, subscription.carsAdded - effectiveCarLimit);

    return {
        hasActiveSubscription: true,
        subscription: {
            packageTitle: packageData.title,
            basePrice: subscription.price,
            customizedPrice: (subscription as any).totalMonthlyPrice ?? subscription.price,
            duration: packageData.duration,
            status: subscription.status,
            currentPeriodStart: (subscription as any).currentPeriodStart,
            currentPeriodEnd: (subscription as any).currentPeriodEnd,
            isCustomized: !!(subscription as any).customCarLimit,
            allowsCustomization: packageData.allowCustomization,
        },
        cars: {
            baseLimit: packageData.carLimit,
            effectiveLimit: effectiveCarLimit,
            used: subscription.carsAdded,
            usedInPackage: carsUsedInPackage,
            additional: additionalCars,
            remaining: Math.max(0, effectiveCarLimit - subscription.carsAdded),
            percentUsed: effectiveCarLimit > 0 
                ? Math.min(100, (subscription.carsAdded / effectiveCarLimit) * 100)
                : 0
        },
        costs: {
            baseSubscription: subscription.price,
            customizationCost: ((subscription as any).totalMonthlyPrice ?? subscription.price) - subscription.price,
            monthlyBase: basePrice,
            adHocCharges: subscription.adHocCharges || 0,
            adHocPricePerCar: effectiveAdHocPrice,
            totalMonthly: basePrice + (subscription.adHocCharges || 0),
        },
        customization: (subscription as any).customCarLimit ? {
            customCarLimit: (subscription as any).customCarLimit,
            additionalCarsIncluded: (subscription as any).customCarLimit - packageData.carLimit,
            pricePerAdditionalCar: packageData.adHocPricePerCar
        } : null,
        nextBillingDate: (subscription as any).currentPeriodEnd,
    };
};

/**
 * Customize subscription (DEALER only)
 */
const customizeSubscriptionInDB = async (
user: JwtPayload, customCarLimit: number,) => {
    const subscription = await Subscription.findOne({
        user: user.id,
        status: 'active'
    }).populate('package');

    if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'No active subscription found');
    }

    const packageData: any = subscription.package;

    // Check if customization is allowed
    if (!packageData.allowCustomization) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            'This package does not allow customization. Please contact support.'
        );
    }

    // Validate custom limit
    if (customCarLimit < packageData.carLimit) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Custom limit must be at least ${packageData.carLimit} (package base limit)`
        );
    }

    // Calculate pricing using package's ad-hoc price
    const additionalCars = customCarLimit - packageData.carLimit;
    const pricePerCar = packageData.adHocPricePerCar; // Always use package price
    const additionalCost = additionalCars * pricePerCar;
    const newTotalMonthlyPrice = packageData.price + additionalCost;

    // Update subscription
    subscription.customCarLimit = customCarLimit;
    (subscription as any).totalMonthlyPrice = newTotalMonthlyPrice;

    await subscription.save();


    return {
        success: true,
        message: 'Subscription customized successfully',
        details: {
            package: {
                title: packageData.title,
                baseLimit: packageData.carLimit,
                basePrice: packageData.price,
                adHocPricePerCar: packageData.adHocPricePerCar
            },
            customization: {
                customLimit: customCarLimit,
                additionalCarsIncluded: additionalCars,
                pricePerAdditionalCar: pricePerCar,
                additionalMonthlyCost: additionalCost,
                newTotalMonthlyPrice
            },
            currentUsage: {
                carsAdded: subscription.carsAdded,
                remainingSlots: Math.max(0, customCarLimit - subscription.carsAdded)
            }
        }
    };
};

export const SubscriptionService = {
    subscriptionDetailsFromDB,
    getAllSubscriptionsFromDB,
    getSubscriptionByIdFromDB,
    getSubscriptionHistoryFromDB,
    getSubscriptionStatsFromDB,
    customizeSubscriptionInDB
};


