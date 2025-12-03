import { Request, Response } from 'express';
import Stripe from 'stripe';
import colors from 'colors';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../shared/logger';
import config from '../config';
import ApiError from '../errors/ApiError';
import stripe from '../config/stripe';
import { handleCheckoutSession } from '../handlers/handleCheckoutSession';
import { handleAccountConnectEvent } from '../handlers';
import { handleSubscriptionEvent } from './stripe.event';
import { User } from '../app/modules/user/user.model';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { sendNotifications } from '../helpers/notificationsHelper';
const handleStripeWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = config.stripe.webhookSecret as string;

    let event: Stripe.Event | undefined;

    try {
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (error) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Webhook signature verification failed. ${error}`);
    }

    if (!event) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid event received!');
    }

    const data = event.data.object as Stripe.Subscription | Stripe.Account | Stripe.Checkout.Session;
    const eventType = event.type;

    try {
        switch (eventType) {
            case 'account.updated':
            case 'account.external_account.created':
            case 'account.external_account.deleted':
                await handleAccountConnectEvent(data as Stripe.Account);
                break;

            case 'checkout.session.completed':
                // ✅ Delegate to the unified handler
                await handleSubscriptionEvent(event);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionEvent(event);
                logger.info(colors.bgBlue.bold(`Subscription updated: ${(data as Stripe.Subscription).id}`));
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionEvent(event);
                logger.info(colors.bgYellow.bold(`Subscription deleted: ${(data as Stripe.Subscription).id}`));
                break;

            case 'invoice.payment_succeeded':
                await handleSubscriptionEvent(event);
                logger.info(colors.bgGreen.bold(`Invoice payment succeeded`));
                break;

            case 'invoice.payment_failed':
                await handleSubscriptionEvent(event);
                logger.warn(colors.bgRed.bold(`Invoice payment failed`));
                break;

            case 'invoice.created':
                await handleSubscriptionEvent(event);
                break;

            default:
                logger.warn(colors.bgGreen.bold(`Unhandled event type: ${eventType}`));
        }
    } catch (error) {
        logger.error(colors.bgRed.bold(`Error handling event: ${error}`));
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error handling event: ${error}`);
    }

    res.sendStatus(200);
};



export default handleStripeWebhook;