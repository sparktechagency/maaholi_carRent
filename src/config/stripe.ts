import Stripe from 'stripe';
import config from '.';

const stripe = new Stripe(config.stripe.stripeSecretKey as string, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
});

export default stripe;