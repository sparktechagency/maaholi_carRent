import Stripe from 'stripe';
import { logger } from '../shared/logger';
import colors from 'colors';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { User } from '../app/modules/user/user.model';
import { sendNotifications } from '../helpers/notificationsHelper';
import stripe from '../config/stripe';
import { Package } from '../app/modules/package/package.model';

export const handleSubscriptionEvent = async (event: Stripe.Event) => {
    console.log('🎯 [Subscription Event] Type:', event.type);
    
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                console.log('✅ [Checkout] Processing session completed');
                const session = event.data.object as Stripe.Checkout.Session;
                console.log('📦 [Checkout] Mode:', session.mode);
                console.log('📦 [Checkout] Payment Status:', session.payment_status);
                
                if (session.mode === "subscription" && session.payment_status === 'paid') {
                    const subscriptionId = session.subscription as string;
                    const customerId = session.customer as string;
                    const userId = session.metadata?.userId;
                    const packageId = session.metadata?.packageId;
                    const targetRole = session.metadata?.targetRole;

                    console.log('💳 [Checkout] Subscription ID:', subscriptionId);
                    console.log('👤 [Checkout] Customer ID:', customerId);
                    console.log('🆔 [Checkout] User ID:', userId);
                    console.log('📦 [Checkout] Package ID:', packageId);
                    console.log('🎭 [Checkout] Target Role:', targetRole);

                    if (!userId || !packageId || !targetRole) {
                        logger.error(colors.bgRed.bold('❌ Missing metadata in checkout session'));
                        console.error('Session Metadata:', session.metadata);
                        return;
                    }

                    // Get subscription details from Stripe
                    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
                    console.log('✅ [Stripe] Retrieved subscription:', stripeSubscription.id);

                    // ✅ Update subscription in database
                    // First, try to find the subscription by user and status
                    let updatedSubscription = await Subscription.findOneAndUpdate(
                        { 
                            user: userId,
                            $or: [
                                { trxId: session.id },
                                { subscriptionId: "pending" },
                                { status: "pending" },
                                
                                
                            ]
                        } as any,
                        {
                            subscriptionId: subscriptionId,
                            customerId: customerId,
                            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                            status: "active",
                            trxId: stripeSubscription.latest_invoice as string
                        },
                        { new: true, sort: { createdAt: -1 } }
                    );

                    console.log('💾 [Database] Subscription updated:', !!updatedSubscription);
                    
                    if (!updatedSubscription) {
                        // Debug: Let's see what subscriptions exist for this user
                        const existingSubs = await Subscription.find({ user: userId }).sort({ createdAt: -1 }).limit(3);
                        console.error('🔍 [Debug] Existing subscriptions for user:', userId);
                        existingSubs.forEach(sub => {
                            console.error(`  - ID: ${sub._id}, trxId: ${sub.trxId}, subscriptionId: ${sub.subscriptionId}, status: ${sub.status}`);
                        });
                        
                        logger.error(colors.bgRed.bold(`❌ Failed to find pending subscription for session: ${session.id}`));
                        console.error('Searched for subscription with user:', userId, 'and trxId:', session.id);
                        return;
                    }

                    // ✅ UPDATE USER ROLE & SUBSCRIPTION STATUS
                    const updatedUser = await User.findByIdAndUpdate(
                        userId,
                        {
                            $set: {
                                role: targetRole,
                                currentRole: targetRole,
                                isSubscribed: true,
                                subscribedPackage: packageId,
                                expiryDate: new Date(stripeSubscription.current_period_end * 1000)

                            }
                        },
                        { new: true }
                    );

                    if (updatedUser) {
                        console.log('✅ [Role Upgraded] User:', updatedUser.name || userId);
                        console.log('✅ [New Role]:', updatedUser.role);
                        logger.info(colors.bgGreen.bold(`🎉 ROLE UPGRADED → ${updatedUser.name || userId} is now ${targetRole}`));
                    }

                    // ✅ Send notification
                    const notificationData = {
                        text: `Congratulations! Your subscription is now active and your account has been upgraded to ${targetRole}. You can now add cars to your account.`,
                        receiver: userId,
                        referenceId: subscriptionId,
                        screen: "SUBSCRIPTION"
                    };
                    sendNotifications(notificationData);
                    console.log('📧 [Notification] Sent successfully');

                    logger.info(colors.bgGreen.bold(`✅ Subscription activated for user: ${userId}`));
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log('🔄 [Subscription Updated]', subscription.id, 'Status:', subscription.status);
                
                const updatedSub = await Subscription.findOneAndUpdate(
                    { subscriptionId: subscription.id },
                    {
                        status: subscription.status === "active" ? "active" : "expired",
                        currentPeriodStart: new Date(subscription.current_period_start * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    },
                    { new: true }
                );

                if (updatedSub) {
                    // ✅ If subscription becomes inactive, downgrade role to BUYER
                    if (subscription.status !== "active") {
                        await User.findByIdAndUpdate(
                            updatedSub.user,
                            { 
                                isSubscribed: false,
                                role: 'BUYER', // ✅ Downgrade to BUYER
                                currentRole: 'BUYER'
                            }
                        );
                        logger.info(colors.bgYellow.bold(`⬇️ User ${updatedSub.user} downgraded to BUYER`));
                    } else {
                        await User.findByIdAndUpdate(
                            updatedSub.user,
                            { isSubscribed: true }
                        );
                    }

                    logger.info(colors.bgBlue.bold(`Subscription updated: ${subscription.id} - Status: ${subscription.status}`));

                    if (subscription.status !== "active") {
                        const notificationData = {
                            text: "Your subscription status has been updated. Your account has been reverted to BUYER role.",
                            receiver: updatedSub.user.toString(),
                            referenceId: subscription.id,
                            screen: "SUBSCRIPTION"
                        };
                        sendNotifications(notificationData);
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log('🗑️ [Subscription Deleted]', subscription.id);
                
                const deletedSub = await Subscription.findOneAndUpdate(
                    { subscriptionId: subscription.id },
                    { status: "cancel" },
                    { new: true }
                );

                if (deletedSub) {
                    // ✅ Downgrade to BUYER when subscription is cancelled
                    await User.findByIdAndUpdate(
                        deletedSub.user,
                        { 
                            isSubscribed: false,
                            role: 'BUYER',
                            currentRole: 'BUYER'
                        }
                    );
                    
                    const notificationData = {
                        text: "Your subscription has been cancelled. Your account has been reverted to BUYER role. You will no longer be able to add new cars.",
                        receiver: deletedSub.user.toString(),
                        referenceId: subscription.id,
                        screen: "SUBSCRIPTION"
                    };
                    sendNotifications(notificationData);

                    logger.info(colors.bgYellow.bold(`Subscription cancelled: ${subscription.id} - User reverted to BUYER`));
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('💰 [Invoice Payment Succeeded]', invoice.id);
                
                if (invoice.subscription) {
                    const subscription: any = await Subscription.findOne({
                        subscriptionId: invoice.subscription
                    }).populate('package', 'title');

                    if (subscription) {
                        await Subscription.findByIdAndUpdate(subscription._id, {
                            trxId: invoice.payment_intent as string
                        });

                        logger.info(colors.bgGreen.bold(`Invoice payment succeeded for subscription: ${invoice.subscription}`));

                        const hasAdHocCharges = invoice.lines.data.some(
                            line => line.description?.toLowerCase().includes('ad-hoc') || 
                                   line.description?.toLowerCase().includes('additional car') ||
                                   line.description?.toLowerCase().includes('bulk upload')
                        );

                        if (hasAdHocCharges) {
                            const adHocItems = invoice.lines.data.filter(
                                line => line.description?.toLowerCase().includes('ad-hoc') || 
                                       line.description?.toLowerCase().includes('additional car') ||
                                       line.description?.toLowerCase().includes('bulk upload')
                            );

                            const adHocTotal = adHocItems.reduce((sum, item) => sum + (item.amount || 0), 0) / 100;

                            console.log(`💳 [Ad-hoc Payment] $${adHocTotal} for ${adHocItems.length} item(s)`);

                            const notificationData = {
                                text: `Payment successful! You've been charged $${(invoice.amount_paid / 100).toFixed(2)} (Subscription: $${((invoice.amount_paid - adHocTotal * 100) / 100).toFixed(2)} + Ad-hoc cars: $${adHocTotal.toFixed(2)})`,
                                receiver: subscription.user.toString(),
                                referenceId: invoice.subscription as string,
                                screen: "SUBSCRIPTION"
                            };
                            sendNotifications(notificationData);
                        } else {
                            const notificationData = {
                                text: `Payment successful! Your subscription payment of $${(invoice.amount_paid / 100).toFixed(2)} has been processed.`,
                                receiver: subscription.user.toString(),
                                referenceId: invoice.subscription as string,
                                screen: "SUBSCRIPTION"
                            };
                            sendNotifications(notificationData);
                        }

                        const stripeSubscription = await stripe.subscriptions.retrieve(
                            invoice.subscription as string
                        );
                        
                        const isNewPeriod = 
                            new Date(subscription.currentPeriodStart).getTime() < 
                            new Date(stripeSubscription.current_period_start * 1000).getTime();

                        if (isNewPeriod) {
                            console.log('🔄 [New Billing Period] Resetting ad-hoc charges');
                            await Subscription.findByIdAndUpdate(subscription._id, {
                                adHocCars: 0,
                                adHocCharges: 0,
                                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                            });
                        }
                    }
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('❌ [Invoice Payment Failed]', invoice.id);
                
                if (invoice.subscription) {
                    const subscription = await Subscription.findOne({
                        subscriptionId: invoice.subscription
                    });

                    if (subscription) {
                        const notificationData = {
                            text: "Your subscription payment failed. Please update your payment method to avoid service interruption.",
                            receiver: subscription.user.toString(),
                            referenceId: invoice.subscription as string,
                            screen: "SUBSCRIPTION"
                        };
                        sendNotifications(notificationData);

                        logger.warn(colors.bgRed.bold(`Invoice payment failed for subscription: ${invoice.subscription}`));
                    }
                }
                break;
            }

            case 'invoice.created': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('📄 [Invoice Created]', invoice.id);
                
                if (invoice.subscription) {
                    const subscription = await Subscription.findOne({
                        subscriptionId: invoice.subscription
                    });

                    if (subscription && invoice.total > 0) {
                        console.log(`📊 [Upcoming Invoice] Subscription: ${invoice.subscription}, Amount: $${(invoice.total / 100).toFixed(2)}`);
                        
                        const hasAdHocItems = invoice.lines.data.some(
                            line => line.description?.toLowerCase().includes('ad-hoc') || 
                                   line.description?.toLowerCase().includes('additional car') ||
                                   line.description?.toLowerCase().includes('bulk upload')
                        );

                        if (hasAdHocItems) {
                            console.log('⚠️ [Ad-hoc Charges] This invoice includes ad-hoc charges');
                        }
                    }
                }
                break;
            }

            default:
                logger.warn(colors.bgYellow.bold(`Unhandled subscription event: ${event.type}`));
        }
    } catch (error: any) {
        logger.error(colors.bgRed.bold(`Error in handleSubscriptionEvent: ${error.message}`));
        console.error('Error stack:', error.stack);
        throw error;
    }
};
