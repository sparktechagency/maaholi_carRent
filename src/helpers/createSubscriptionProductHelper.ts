import { IPackage } from "../app/modules/package/package.interface";
import stripe from "../config/stripe";
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

interface ProductPayload {
    title?: string;
    description?: string;
    duration?: string;
    price?: number;
}


export const createSubscriptionProduct = async (payload: ProductPayload) => {
    try {
        // Create product
        const product = await stripe.products.create({
            name: payload.title || 'Subscription Package',
            description: payload.description || '',
        });

        // Create price
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round((payload.price || 0) * 100), // Convert to cents
            currency: 'usd',
            recurring: {
                interval: payload.duration === 'year' ? 'year' : 'month',
            },
        });

        return {
            productId: product.id,
            priceId: price.id,
        };
    } catch (error: any) {
        console.error('Stripe product creation error:', error);
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Failed to create Stripe product: ${error.message}`
        );
    }
};


export const updateSubscriptionProduct = async (
    productId: string,
    payload: ProductPayload
) => {
    try {
        // Update product details (name, description)
        if (payload.title || payload.description) {
            await stripe.products.update(productId, {
                name: payload.title,
                description: payload.description,
            });
        }

        // If price or duration changed, create a new price
        // (Stripe doesn't allow editing existing prices)
        let newPriceId = null;
        if (payload.price !== undefined || payload.duration) {
            const newPrice = await stripe.prices.create({
                product: productId,
                unit_amount: Math.round((payload.price || 0) * 100),
                currency: 'usd',
                recurring: {
                    interval: payload.duration === 'year' ? 'year' : 'month',
                },
            });
            newPriceId = newPrice.id;
        }

        return {
            productId: productId,
            priceId: newPriceId, // Returns new price ID if price changed
        };
    } catch (error: any) {
        console.error('Stripe product update error:', error);
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Failed to update Stripe product: ${error.message}`
        );
    }
};

/**
 * Archive (deactivate) a Stripe product
 */
export const archiveSubscriptionProduct = async (productId: string) => {
    try {
        await stripe.products.update(productId, {
            active: false,
        });
        return { success: true };
    } catch (error: any) {
        console.error('Stripe product archive error:', error);
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Failed to archive Stripe product: ${error.message}`
        );
    }
};

// export const createSubscriptionProduct = async (
//     payload:Partial<IPackage>):Promise<{ priceId: string, productId: string } | null> =>{

//     // Create Product in Stripe
//     const product = await stripe.products.create({
//         name: payload.title as string,
//         description: payload.description as string,
//     });
    
//     // Validate interval for Stripe Price API
//     const duration: 'month' | 'year' = 
//         payload.duration === 'month' || 
//         payload.duration === 'year' ? payload.duration : 'month'; // Default to 'month' if not provided

//     // Create Price for the Product
//     const price = await stripe.prices.create({
//         product: product.id,
//         unit_amount: Number(payload.price) * 100, // in cents
//         currency: 'usd', // or your chosen currency
//         recurring: { interval: duration }, // e.g., 'month', 'year'
//     });

//     return { priceId: price.id, productId: product.id };
// }