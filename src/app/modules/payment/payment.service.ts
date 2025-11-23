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
        success_url: "https://www.admin.barbermeus.com/public/payment-success",
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
        refresh_url: "https://www.admin.barbermeus.com/public/onboard-success",
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

// transfer and payout credit
const transferAndPayoutToBarber = async (id: string) => {

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

    const isExistReservation: IReservation | any = await Reservation.findById(id);
    if (!isExistReservation) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Reservation doesn't exist!");
    }

    const isExistBarber = await User.isAccountCreated(isExistReservation.barber);
    if (!isExistBarber) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Sorry, you are didn't provide bank information. Please create a bank account");
    }

    //check completed payment and barber transfer
    if (isExistReservation.status === "Completed" && isExistReservation.paymentStatus === "Paid") {
        throw new ApiError(StatusCodes.BAD_REQUEST, "The payment has already been transferred to your account.");
    }

    //check completed payment and barber transfer
    if (isExistReservation.transfer === true) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "The payment has already been transferred to your account.");
    }

    const { accountId, externalAccountId } = isExistBarber?.accountInformation;
    const { price } = isExistReservation;

    const charge = (parseInt(price.toString()) * 10) / 100;
    const amount = parseInt(price.toString()) - charge;

    const transfer = await stripe.transfers.create({
        amount: amount * 100,
        currency: "usd",
        destination: accountId,
    });

    if (!transfer) throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to transfer payment');

    const payouts = await stripe.payouts.create(
        {
            amount: amount * 100,
            currency: "usd",
            destination: externalAccountId,
        },
        {
            stripeAccount: accountId,
        }
    );

    if (payouts.status !== "paid") throw new Error("Failed to complete payout");

    if (payouts.status === "paid") {
        await Reservation.findOneAndUpdate(
            { _id: id },
            { transfer: true },
            { new: true });

        const data = {
            text: "Congratulations! Your payment has been transferred to your account.",
            receiver: isExistReservation.barber,
            referenceId: id,
            screen: "RESERVATION"
        }
        sendNotifications(data);

    }

    return;
}

/**
 * Create Subscription Checkout Session for Package Payment
 */
const createSubscriptionCheckoutToStripe = async (
    user: JwtPayload,
    packageId: string
): Promise<string | null> => {
    
    // 1. Validate package
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Package ID");
    }

    const packageData = await Package.findById(packageId);
    if (!packageData) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
    }

    // 2. Get user details
    const userData = await User.findById(user.id);
    if (!userData) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    // 3. Check if user already has active subscription
    const existingSubscription = await Subscription.findOne({
        user: user.id,
        status: "active"
    });

    if (existingSubscription) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "You already have an active subscription. Please cancel it first."
        );
    }

    try {
        // 4. Create or get Stripe customer
        let customerId = "";
        
        const canceledSubscription = await Subscription.findOne({
            user: user.id,
            status: { $in: ["cancel", "expired"] }
        }).sort({ createdAt: -1 });

        if (canceledSubscription?.customerId) {
            // Reuse existing customer
            customerId = canceledSubscription.customerId;
        } else {
            // Create new customer
            const customer = await stripe.customers.create({
                email: userData.email,
                name: userData.name,
                metadata: {
                    userId: user.id.toString(),
                    role: userData.role
                }
            });
            customerId = customer.id;
        }

        // 5. Create Checkout Session for Subscription
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: "subscription",
            customer: customerId,
            line_items: [
                {
                    price: packageData.priceId as string,
                    quantity: 1,
                },
            ],
            metadata: {
                userId: user.id.toString(),
                packageId: packageId.toString(),
                packageTitle: packageData.title as string,
            },
            success_url: `https://dashboard.stripe.com/public/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: "https://www.admin.barbermeus.com/public/subscription-failed",
            subscription_data: {
                metadata: {
                    userId: user.id.toString(),
                    packageId: packageId.toString(),
                }
            }
        };

        const session = await stripe.checkout.sessions.create(sessionParams);

        if (!session) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create subscription checkout");
        }

        // 6. Save pending subscription (will be activated by webhook)
        await Subscription.create({
            customerId: customerId,
            price: packageData.price,
            user: user.id,
            package: packageId,
            trxId: session.id,
            subscriptionId: "pending",
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: "expired",
            carsAdded: 0,
            adHocCharges: 0,
            adHocCars: 0
        });

        return session.url;
    } catch (error: any) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Subscription checkout failed: ${error.message}`
        );
    }
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
    transferAndPayoutToBarber,
    createSubscriptionCheckoutToStripe,
    cancelSubscriptionFromStripe
};