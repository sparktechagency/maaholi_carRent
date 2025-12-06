import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { User } from "../user/user.model";
import { JwtPayload } from "jsonwebtoken";
import Stripe from "stripe";
import stripe from "../../../config/stripe";
import { Reservation } from "../reservation/reservation.model";
import { IUser } from "../user/user.interface";
import { IReservation } from "../reservation/reservation.interface";
import mongoose from "mongoose";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { Package } from "../package/package.model";
import { Subscription } from "../subscription/subscription.model";

const createPaymentCheckoutToStripe = async (user: JwtPayload, payload: any): Promise<string | null> => {
    const { price, service_name, id, tips } = payload;

    if (!service_name) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Service name is required");
    }

    if (!id) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Reservation ID is required");
    }

    // Create a checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: `${service_name} Service Reservation Payment`,
                    },
                    unit_amount: price ? Math.trunc(price * 100) : Math.trunc(tips * 100),
                },
                quantity: 1,
            },
        ],
        customer_email: user?.email,
        success_url: "http://10.10.7.47:3000/profile",
        cancel_url: "https://www.admin.barbermeus.com/public/payment-failed"
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Payment Checkout");
    } else {
        await Reservation.findOneAndUpdate(
            { _id: id },
            {
                sessionId: session.id,
                tips: tips ? Number(tips) : 0
            },
            { new: true }
        );
    }

    return session?.url;
};

// create account
const createAccountToStripe = async (user: JwtPayload) => {

    // check this user is exist
    const existingUser: IUser | null = await User.findById(user.id).select("+accountInformation").lean();
    if (existingUser?.accountInformation?.accountUrl) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    // create account
    const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user?.email,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
    });

    if (!account) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create account");
    }

    // // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: "http://10.10.7.47:3000/profile",
        return_url: "https://www.admin.barbermeus.com/public/onboard-failed",
        type: 'account_onboarding',
    });

    // update account
    const updateAccount = await User.findOneAndUpdate(
        { _id: user.id },
        { "accountInformation.accountId": account.id },
        { new: true }
    );

    if (!updateAccount) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update account");
    }

    return accountLink?.url;
}



const createSubscriptionCheckoutToStripe = async (
    user: JwtPayload,
    packageId: string
): Promise<string | null> => {
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Package ID");
    }

    const packageData = await Package.findById(packageId);
    if (!packageData) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
    }

    const userData = await User.findById(user.id);
    if (!userData) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    const existingSubscription = await Subscription.findOne({
        user: user.id,
        status: "active"
    });

    if (existingSubscription) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "You already have an active subscription.");
    }

    let customerId = "";
    const canceledSub = await Subscription.findOne({
        user: user.id,
        status: { $in: ["canceled", "expired", "cancel"] }
    }).sort({ createdAt: -1 });

    if (canceledSub?.customerId) {
        customerId = canceledSub.customerId;
        console.log('♻️ [Reusing Customer ID]:', customerId);
    } else {
        const customer = await stripe.customers.create({
            email: userData.email,
            name: userData.name,
            metadata: { userId: user.id.toString() }
        });
        customerId = customer.id;
        console.log('🆕 [Created New Customer]:', customerId);
    }

    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: packageData.priceId as string, quantity: 1 }],
        metadata: {
            userId: user.id.toString(),
            packageId: packageId,
            targetRole: packageData.targetRole,
        },
        success_url: `${process.env.FRONTEND_URL}`, ///subscription/success?session_id={CHECKOUT_SESSION_ID}
        cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
        subscription_data: {
            metadata: {
                userId: user.id.toString(),
                packageId: packageId,
                targetRole: packageData.targetRole,
            }
        }
    });

    console.log('✅ [Checkout Session Created]:', session.id);
    console.log('🎯 [Target Role]:', packageData.targetRole);

    // ✅ CRITICAL FIX: Save with status "pending" and correct trxId
    const newSubscription = await Subscription.create({
        user: user.id,
        package: packageId,
        customerId,
        price: packageData.price,
        trxId: session.id,              
        subscriptionId: "pending",   
        status: "pending",             
        targetRole: packageData.targetRole,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        carsAdded: 0,
        adHocCharges: 0,
        adHocCars: 0
    });

    console.log('💾 [Pending Subscription Created]:', newSubscription._id);
    console.log('📝 [Subscription Details]:', {
        userId: user.id,
        trxId: session.id,
        status: newSubscription.status,
        targetRole: packageData.targetRole
    });

    return session.url || null;
};
/**
 * Cancel user's subscription
 */
const cancelSubscriptionFromStripe = async (user: JwtPayload) => {
    const subscription = await Subscription.findOne({
        user: user.id,
        status: "active"
    });

    if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, "No active subscription found");
    }

    try {
        // Cancel subscription in Stripe
        await stripe.subscriptions.cancel(subscription.subscriptionId);

        // Update database
        await Promise.all([
            Subscription.findByIdAndUpdate(subscription._id, { status: "cancel" }),
            User.findByIdAndUpdate(user.id, { isSubscribed: false })
        ]);

        const notificationData = {
            text: "Your subscription has been cancelled successfully.",
            receiver: user.id,
            referenceId: subscription.subscriptionId,
            screen: "SUBSCRIPTION"
        };
        sendNotifications(notificationData);

        return { message: "Subscription cancelled successfully" };
    } catch (error: any) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Failed to cancel subscription: ${error.message}`
        );
    }
};


export const PaymentService = {
    createPaymentCheckoutToStripe,
    createAccountToStripe,
    createSubscriptionCheckoutToStripe,
    cancelSubscriptionFromStripe
};