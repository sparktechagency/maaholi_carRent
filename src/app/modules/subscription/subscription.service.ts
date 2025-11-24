import { JwtPayload } from "jsonwebtoken";
import { ISubscription } from "./subscription.interface";
import { Subscription } from "./subscription.model";
import stripe from "../../../config/stripe";
import { User } from "../user/user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";


// const subscriptionDetailsFromDB = async (user: JwtPayload): Promise<{ subscription: ISubscription | {} }> => {

//     const subscription = await Subscription.findOne({ user: user.id }).populate("package", "title credit").lean();
//     if (!subscription) {
//         return { subscription: {} };
//     }

//     const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

//     // Check subscription status and update database accordingly
//     if (subscriptionFromStripe?.status !== "active") {
//         await Promise.all([
//             User.findByIdAndUpdate(user.id, { isSubscribed: false }, { new: true }),
//             Subscription.findOneAndUpdate({ user: user.id }, { status: "expired" }, { new: true }),
//         ]);
//     }

//     return { subscription };
// };
const subscriptionDetailsFromDB = async (
    user: JwtPayload
): Promise<{ subscription: ISubscription | {} }> => {
    const subscription = await Subscription.findOne({ user: user.id })
        .populate("package", "title description price duration carLimit adHocPricePerCar feature")
        .populate("user", "name email profile")
        .lean();

    if (!subscription) {
        return { subscription: {} };
    }

    // Sync with Stripe to get latest status
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

            // Return updated subscription
            const updatedSubscription = await Subscription.findOne({ user: user.id })
                .populate("package", "title description price duration carLimit adHocPricePerCar feature")
                .populate("user", "name email profile")
                .lean();

            return { subscription: updatedSubscription || {} };
        }
    } catch (error: any) {
        console.error("Error syncing with Stripe:", error.message);
        // Continue with database data if Stripe fails
    }

    return { subscription };
};

/**
 * Get all users' subscriptions (Admin only)
 */
const getAllSubscriptionsFromDB = async (query: any) => {
    const { status, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    // Build filter
    const filter: any = {};
    
    if (status) {
        filter.status = status; // active, expired, cancel
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
        filter.barber = { $in: userIds };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get subscriptions
    const subscriptions = await Subscription.find(filter)
        .populate("package", "title description price duration carLimit adHocPricePerCar feature")
        .populate("user", "name email profile role isSubscribed")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean();

    // Get total count
    const total = await Subscription.countDocuments(filter);

    // Calculate statistics
    const stats = {
        totalSubscriptions: total,
        activeSubscriptions: await Subscription.countDocuments({ status: 'active' }),
        expiredSubscriptions: await Subscription.countDocuments({ status: 'expired' }),
        canceledSubscriptions: await Subscription.countDocuments({ status: 'cancel' }),
        totalRevenue: subscriptions.reduce((sum: number, sub: any) => sum + sub.price, 0),
        totalAdHocRevenue: subscriptions.reduce((sum: number, sub: any) => sum + (sub.adHocCharges || 0), 0),
    };

    return {
        subscriptions,
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
        .populate("package", "title description price duration carLimit adHocPricePerCar feature")
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

    return {
        subscription,
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
            // Calculate total spent including ad-hoc charges
            return sum + sub.price + (sub.adHocCharges || 0);
        }, 0),
        totalCarsAdded: subscriptions.reduce((sum: number, sub: any) => sum + (sub.carsAdded || 0), 0)
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
    }).populate("package", "title carLimit adHocPricePerCar");

    if (!subscription) {
        return {
            hasActiveSubscription: false,
            message: "No active subscription found"
        };
    }

    const packageData: any = subscription.package;
    const carsUsedInPackage = Math.min(subscription.carsAdded, packageData.carLimit);
    const additionalCars = Math.max(0, subscription.carsAdded - packageData.carLimit);

    return {
        hasActiveSubscription: true,
        subscription: {
            packageTitle: packageData.title,
            basePrice: subscription.price,
            duration: packageData.duration,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
        },
        cars: {
            limit: packageData.carLimit,
            used: subscription.carsAdded,
            usedInPackage: carsUsedInPackage,
            additional: additionalCars,
            remaining: Math.max(0, packageData.carLimit - subscription.carsAdded),
        },
        costs: {
            baseSubscription: subscription.price,
            adHocCharges: subscription.adHocCharges,
            adHocPricePerCar: packageData.adHocPricePerCar,
            totalMonthly: subscription.price + subscription.adHocCharges,
        },
        nextBillingDate: subscription.currentPeriodEnd,
    };
};

export const SubscriptionService = {
    subscriptionDetailsFromDB,
    getAllSubscriptionsFromDB,
    getSubscriptionByIdFromDB,
    getSubscriptionHistoryFromDB,
    getSubscriptionStatsFromDB
}