import Stripe from 'stripe';
import { logger } from '../shared/logger';
import colors from 'colors';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { User } from '../app/modules/user/user.model';
import { sendNotifications } from '../helpers/notificationsHelper';
import stripe from '../config/stripe';

export const handleSubscriptionEvent = async (event: Stripe.Event) => {
    console.log('🎯 [Subscription Event] Type:', event.type);
    
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                console.log('✅ [Checkout] Processing session completed');
                const session = event.data.object as Stripe.Checkout.Session;
                console.log('📦 [Checkout] Mode:', session.mode);
                console.log('📦 [Checkout] Payment Status:', session.payment_status);
                
                if (session.mode === "subscription") {
                    const subscriptionId = session.subscription as string;
                    const customerId = session.customer as string;
                    const userId = session.metadata?.userId;
                    const packageId = session.metadata?.packageId;

                    console.log('💳 [Checkout] Subscription ID:', subscriptionId);
                    console.log('👤 [Checkout] Customer ID:', customerId);
                    console.log('🆔 [Checkout] User ID:', userId);
                    console.log('📦 [Checkout] Package ID:', packageId);

                    if (!userId || !packageId) {
                        logger.error(colors.bgRed.bold('❌ Missing metadata in checkout session'));
                        console.error('Session Metadata:', session.metadata);
                        return;
                    }

                    // Get subscription details from Stripe
                    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
                    console.log('✅ [Stripe] Retrieved subscription:', stripeSubscription.id);

                    // Update subscription in database
                    const updatedSubscription = await Subscription.findOneAndUpdate(
                        { 
                            user: userId,
                            trxId: session.id 
                        },
                        {
                            subscriptionId: subscriptionId,
                            customerId: customerId,
                            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                            status: "active",
                            trxId: stripeSubscription.latest_invoice as string
                        },
                        { new: true }
                    );

                    console.log('💾 [Database] Subscription updated:', !!updatedSubscription);
                    
                    if (updatedSubscription) {
                        // Update user subscription status
                        const updatedUser = await User.findByIdAndUpdate(
                            userId, 
                            { isSubscribed: true },
                            { new: true }
                        );
                        console.log('✅ [Database] User isSubscribed:', updatedUser?.isSubscribed);

                        // Send notification
                        const notificationData = {
                            text: "Congratulations! Your subscription is now active. You can now add cars to your account.",
                            receiver: userId,
                            referenceId: subscriptionId,
                            screen: "SUBSCRIPTION"
                        };
                        sendNotifications(notificationData);
                        console.log('📧 [Notification] Sent successfully');

                        logger.info(colors.bgGreen.bold(`✅ Subscription activated for user: ${userId}`));
                    } else {
                        logger.error(colors.bgRed.bold(`❌ Failed to find pending subscription for session: ${session.id}`));
                        console.error('Searched for subscription with user:', userId, 'and trxId:', session.id);
                    }
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
                        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                    },
                    { new: true }
                );

                if (updatedSub) {
                    // Update user status based on subscription status
                    await User.findByIdAndUpdate(
                        updatedSub.user,
                        { isSubscribed: subscription.status === "active" }
                    );

                    logger.info(colors.bgBlue.bold(`Subscription updated: ${subscription.id} - Status: ${subscription.status}`));

                    // Notify user if subscription is no longer active
                    if (subscription.status !== "active") {
                        const notificationData = {
                            text: "Your subscription status has been updated. Please check your subscription details.",
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
                    await User.findByIdAndUpdate(deletedSub.user, { isSubscribed: false });
                    
                    const notificationData = {
                        text: "Your subscription has been cancelled. You will no longer be able to add new cars.",
                        receiver: deletedSub.user.toString(),
                        referenceId: subscription.id,
                        screen: "SUBSCRIPTION"
                    };
                    sendNotifications(notificationData);

                    logger.info(colors.bgYellow.bold(`Subscription cancelled: ${subscription.id}`));
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('💰 [Invoice Payment Succeeded]', invoice.id);
                
                // Check if this is for a subscription
                if (invoice.subscription) {
                    const subscription = await Subscription.findOne({
                        subscriptionId: invoice.subscription
                    }).populate('package', 'title');

                    if (subscription) {
                        // Update transaction ID for recurring payments
                        await Subscription.findByIdAndUpdate(subscription._id, {
                            trxId: invoice.payment_intent as string
                        });

                        logger.info(colors.bgGreen.bold(`Invoice payment succeeded for subscription: ${invoice.subscription}`));

                        // Check for ad-hoc charges (bulk upload additional cars)
                        const hasAdHocCharges = invoice.lines.data.some(
                            line => line.description?.toLowerCase().includes('ad-hoc') || 
                                   line.description?.toLowerCase().includes('additional car') ||
                                   line.description?.toLowerCase().includes('bulk upload')
                        );

                        if (hasAdHocCharges) {
                            // Extract ad-hoc details
                            const adHocItems = invoice.lines.data.filter(
                                line => line.description?.toLowerCase().includes('ad-hoc') || 
                                       line.description?.toLowerCase().includes('additional car') ||
                                       line.description?.toLowerCase().includes('bulk upload')
                            );

                            const adHocTotal = adHocItems.reduce((sum, item) => sum + (item.amount || 0), 0) / 100;

                            console.log(`💳 [Ad-hoc Payment] $${adHocTotal} for ${adHocItems.length} item(s)`);

                            // Send detailed notification
                            const notificationData = {
                                text: `Payment successful! You've been charged $${(invoice.amount_paid / 100).toFixed(2)} (Subscription: $${((invoice.amount_paid - adHocTotal * 100) / 100).toFixed(2)} + Ad-hoc cars: $${adHocTotal.toFixed(2)})`,
                                receiver: subscription.user.toString(),
                                referenceId: invoice.subscription as string,
                                screen: "SUBSCRIPTION"
                            };
                            sendNotifications(notificationData);
                        } else {
                            // Regular recurring payment notification
                            const notificationData = {
                                text: `Payment successful! Your subscription payment of $${(invoice.amount_paid / 100).toFixed(2)} has been processed.`,
                                receiver: subscription.user.toString(),
                                referenceId: invoice.subscription as string,
                                screen: "SUBSCRIPTION"
                            };
                            sendNotifications(notificationData);
                        }

                        // Reset ad-hoc charges for the new billing period (if this is a new period)
                        const stripeSubscription = await stripe.subscriptions.retrieve(
                            invoice.subscription as string
                        );
                        
                        // Check if this is the start of a new billing period
                        const isNewPeriod = 
                            new Date(subscription.currentPeriodStart).getTime() < 
                            new Date(stripeSubscription.current_period_start * 1000).getTime();

                        if (isNewPeriod) {
                            console.log('🔄 [New Billing Period] Resetting ad-hoc charges');
                            await Subscription.findByIdAndUpdate(subscription._id, {
                                adHocCars: 0,
                                adHocCharges: 0,
                                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
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
                
                // Log upcoming charges for transparency
                if (invoice.subscription) {
                    const subscription = await Subscription.findOne({
                        subscriptionId: invoice.subscription
                    });

                    if (subscription && invoice.total > 0) {
                        console.log(`📊 [Upcoming Invoice] Subscription: ${invoice.subscription}, Amount: $${(invoice.total / 100).toFixed(2)}`);
                        
                        // Check for ad-hoc items
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
// export const handleSubscriptionEvent = async (event: Stripe.Event) => {
//     console.log('🎯 [Subscription Event] Type:', event.type);
    
//     try {
//         switch (event.type) {
//             case 'checkout.session.completed': {
//                 console.log('✅ [Checkout] Processing session completed');
//                 const session = event.data.object as Stripe.Checkout.Session;
//                 console.log('📦 [Checkout] Mode:', session.mode);
//                 console.log('📦 [Checkout] Payment Status:', session.payment_status);
                
//                 if (session.mode === "subscription") {
//                     const subscriptionId = session.subscription as string;
//                     const customerId = session.customer as string;
//                     const userId = session.metadata?.userId;
//                     const packageId = session.metadata?.packageId;

//                     console.log('💳 [Checkout] Subscription ID:', subscriptionId);
//                     console.log('👤 [Checkout] Customer ID:', customerId);
//                     console.log('🆔 [Checkout] User ID:', userId);
//                     console.log('📦 [Checkout] Package ID:', packageId);

//                     if (!userId || !packageId) {
//                         logger.error(colors.bgRed.bold('❌ Missing metadata in checkout session'));
//                         console.error('Session Metadata:', session.metadata);
//                         return;
//                     }

//                     // Get subscription details from Stripe
//                     const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
//                     console.log('✅ [Stripe] Retrieved subscription:', stripeSubscription.id);

//                     // Update subscription in database
//                     const updatedSubscription = await Subscription.findOneAndUpdate(
//                         { 
//                             user: userId,
//                             trxId: session.id 
//                         },
//                         {
//                             subscriptionId: subscriptionId,
//                             customerId: customerId,
//                             currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
//                             currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
//                             status: "active",
//                             trxId: stripeSubscription.latest_invoice as string
//                         },
//                         { new: true }
//                     );

//                     console.log('💾 [Database] Subscription updated:', !!updatedSubscription);
                    
//                     if (updatedSubscription) {
//                         // Update user subscription status
//                         const updatedUser = await User.findByIdAndUpdate(
//                             userId, 
//                             { isSubscribed: true },
//                             { new: true }
//                         );
//                         console.log('✅ [Database] User isSubscribed:', updatedUser?.isSubscribed);

//                         // Send notification
//                         const notificationData = {
//                             text: "Congratulations! Your subscription is now active. You can now add cars to your account.",
//                             receiver: userId,
//                             referenceId: subscriptionId,
//                             screen: "SUBSCRIPTION"
//                         };
//                         sendNotifications(notificationData);
//                         console.log('📧 [Notification] Sent successfully');

//                         logger.info(colors.bgGreen.bold(`✅ Subscription activated for user: ${userId}`));
//                     } else {
//                         logger.error(colors.bgRed.bold(`❌ Failed to find pending subscription for session: ${session.id}`));
//                         console.error('Searched for subscription with barber:', userId, 'and trxId:', session.id);
//                     }
//                 }
//                 break;
//             }

//             case 'customer.subscription.updated': {
//                 const subscription = event.data.object as Stripe.Subscription;
                
//                 const updatedSub = await Subscription.findOneAndUpdate(
//                     { subscriptionId: subscription.id },
//                     {
//                         status: subscription.status === "active" ? "active" : "expired",
//                         currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
//                         currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
//                     },
//                     { new: true }
//                 );

//                 if (updatedSub) {
//                     // Update user status based on subscription status
//                     await User.findByIdAndUpdate(
//                         updatedSub.user,
//                         { isSubscribed: subscription.status === "active" }
//                     );

//                     logger.info(colors.bgBlue.bold(`Subscription updated: ${subscription.id} - Status: ${subscription.status}`));

//                     // Notify user if subscription is no longer active
//                     if (subscription.status !== "active") {
//                         const notificationData = {
//                             text: "Your subscription status has been updated. Please check your subscription details.",
//                             receiver: updatedSub.user.toString(),
//                             referenceId: subscription.id,
//                             screen: "SUBSCRIPTION"
//                         };
//                         sendNotifications(notificationData);
//                     }
//                 }
//                 break;
//             }

//             case 'customer.subscription.deleted': {
//                 const subscription = event.data.object as Stripe.Subscription;
                
//                 const deletedSub = await Subscription.findOneAndUpdate(
//                     { subscriptionId: subscription.id },
//                     { status: "cancel" },
//                     { new: true }
//                 );

//                 if (deletedSub) {
//                     await User.findByIdAndUpdate(deletedSub.user, { isSubscribed: false });
                    
//                     const notificationData = {
//                         text: "Your subscription has been cancelled. You will no longer be able to add new cars.",
//                         receiver: deletedSub.user.toString(),
//                         referenceId: subscription.id,
//                         screen: "SUBSCRIPTION"
//                     };
//                     sendNotifications(notificationData);

//                     logger.info(colors.bgYellow.bold(`Subscription cancelled: ${subscription.id}`));
//                 }
//                 break;
//             }

//             case 'invoice.payment_succeeded': {
//                 const invoice = event.data.object as Stripe.Invoice;
                
//                 // Check if this is for a subscription
//                 if (invoice.subscription) {
//                     const subscription = await Subscription.findOne({
//                         subscriptionId: invoice.subscription
//                     });

//                     if (subscription) {
//                         // Update transaction ID for recurring payments
//                         await Subscription.findByIdAndUpdate(subscription._id, {
//                             trxId: invoice.payment_intent as string
//                         });

//                         logger.info(colors.bgGreen.bold(`Invoice payment succeeded for subscription: ${invoice.subscription}`));

//                         // If there are ad-hoc charges (additional cars), notify user
//                         const hasAdHocCharges = invoice.lines.data.some(
//                             line => line.description?.includes('Additional car')
//                         );

//                         if (hasAdHocCharges) {
//                             const notificationData = {
//                                 text: `Payment successful! Your monthly subscription payment of $${(invoice.amount_paid / 100).toFixed(2)} has been processed.`,
//                                 receiver: subscription.user.toString(),
//                                 referenceId: invoice.subscription as string,
//                                 screen: "SUBSCRIPTION"
//                             };
//                             sendNotifications(notificationData);
//                         }
//                     }
//                 }
//                 break;
//             }

//             case 'invoice.payment_failed': {
//                 const invoice = event.data.object as Stripe.Invoice;
                
//                 if (invoice.subscription) {
//                     const subscription = await Subscription.findOne({
//                         subscriptionId: invoice.subscription
//                     });

//                     if (subscription) {
//                         const notificationData = {
//                             text: "Your subscription payment failed. Please update your payment method to avoid service interruption.",
//                             receiver: subscription.user.toString(),
//                             referenceId: invoice.subscription as string,
//                             screen: "SUBSCRIPTION"
//                         };
//                         sendNotifications(notificationData);

//                         logger.warn(colors.bgRed.bold(`Invoice payment failed for subscription: ${invoice.subscription}`));
//                     }
//                 }
//                 break;
//             }

//             default:
//                 logger.warn(colors.bgYellow.bold(`Unhandled subscription event: ${event.type}`));
//         }
//     } catch (error: any) {
//         logger.error(colors.bgRed.bold(`Error in handleSubscriptionEvent: ${error.message}`));
//         throw error;
//     }
// };

