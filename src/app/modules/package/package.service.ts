import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IPackage } from "./package.interface";
import { Package } from "./package.model";
import mongoose from "mongoose";
import { createSubscriptionProduct } from "../../../helpers/createSubscriptionProductHelper";
import { updateSubscriptionProduct } from "../../../helpers/updateSubscriptionProduct";
import stripe from "../../../config/stripe";
import { Subscription } from "../subscription/subscription.model";


/**
 * Create a new package (Admin only)
 */
const createPackageToDB = async (payload: IPackage): Promise<IPackage> => {
    // Create Stripe product
    const productPayload = {
        title: String(payload.title),
        description: String(payload.description),
        duration: payload.duration,
        price: Number(payload.price),
    };

    const product = await createSubscriptionProduct(productPayload);
    if (!product) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Stripe product");
    }

    payload.priceId = product.priceId;
    payload.productId = product.productId;

    // Set default customization based on role
    if (payload.targetRole === 'DELEAR') {
        payload.allowCustomization = true;
    }

    const result = await Package.create(payload);
    if (!result) {
        await stripe.products.del(product.productId);
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create package");
    }

    return result;
};

/**
 * Update package (Admin only - updates base package)
 */
const updatePackageToDB = async (id: string, payload: Partial<IPackage>): Promise<IPackage> => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid package ID");
    }

    const existingPackage = await Package.findById(id);
    if (!existingPackage) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
    }

    // Update Stripe product if price/title/duration changed
    if (payload.price || payload.duration || payload.title) {
        const updateResult = await updateSubscriptionProduct(
            String(existingPackage.productId),
            payload
        );
        if (!updateResult) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update subscription product");
        }
        const { productId, priceId } = updateResult;
        if (priceId !== undefined) {
            payload.priceId = priceId;
        }
        payload.productId = productId;
    }

    const result = await Package.findByIdAndUpdate(id, payload, { new: true });
    if (!result) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update package");
    }

    return result;
};

/**
 * Get all packages (optionally filtered by role)
 */
const getPackageFromDB = async (role?: string): Promise<IPackage[]> => {
    const query = role ? { targetRole: role } : {};
    return await Package.find(query).lean();
};

/**
 * Get single package details
 */
const getPackageDetailsFromDB = async (id: string): Promise<IPackage> => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid package ID");
    }

    const result = await Package.findById(id);
    if (!result) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
    }

    return result;
};

/**
 * Customize subscription for DEALER (user-specific customization)
 * This allows a dealer to increase their car limit with custom pricing
 */
const customizeSubscriptionLimits = async (
    userId: string,
    customCarLimit: number,
    customAdHocPrice?: number
): Promise<any> => {
    const subscription = await Subscription.findOne({ 
        user: userId, 
        status: 'active' 
    }).populate('package');

    if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, "No active subscription found");
    }

    const packageData: any = subscription.package;

    // Only DEALER packages allow customization
    if (!packageData.allowCustomization) {
        throw new ApiError(
            StatusCodes.FORBIDDEN, 
            "This package does not allow customization"
        );
    }

    // Validate custom limit
    if (customCarLimit < packageData.carLimit) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST, 
            `Custom limit must be at least ${packageData.carLimit}`
        );
    }

    // Calculate price adjustment
    const additionalCars = customCarLimit - packageData.carLimit;
    const pricePerCar = customAdHocPrice ?? packageData.adHocPricePerCar;
    const additionalCost = additionalCars * pricePerCar;

    // Update subscription
    subscription.customCarLimit = customCarLimit;
    if (customAdHocPrice) {
        subscription.customAdHocPrice = customAdHocPrice;
    }
    subscription.price = packageData.price + additionalCost;

    await subscription.save();

    return {
        subscription,
        details: {
            baseLimit: packageData.carLimit,
            customLimit: customCarLimit,
            additionalCars,
            pricePerCar,
            additionalCost,
            totalMonthlyPrice: subscription.price
        }
    };
};

export const PackageService = {
    createPackageToDB,
    updatePackageToDB,
    getPackageFromDB,
    getPackageDetailsFromDB,
    customizeSubscriptionLimits
};
// const createPackageToDB = async(payload: IPackage): Promise<IPackage | null>=>{

//     const productPayload = {
//         title: payload.title,
//         description: payload.description,
//         duration: payload.duration,
//         price: payload.price,
//     }

//     const product = await createSubscriptionProduct(productPayload)

//     if(!product){
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create subscription product")
//     }

//     if(product){
//         payload.priceId = product.priceId
//         payload.productId = product.productId
//     }

//     const result = await Package.create(payload);
//     if(!result){
//         await stripe.products.del(product.productId);
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to created Package")
//     }

//     return result;
// }

// const updatePackageToDB = async(id: string, payload: IPackage): Promise<IPackage | null>=>{

//     if(!mongoose.Types.ObjectId.isValid(id)){
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID")
//     }

//     const product:any = await Package.findById(id).select("productId");

//     /* if(payload?.price || payload?.duration || payload.title){
//         const {productId, priceId}:any =  await updateSubscriptionProduct(product?.productId, payload);
//         payload.priceId = priceId;
//         payload.productId = productId;
//     } */

//     const result = await Package.findByIdAndUpdate(
//         {_id: id},
//         payload,
//         { new: true } 
//     );

//     if(!result){
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to Update Package")
//     }

//     return result;
// }


// const getPackageFromDB = async(): Promise<IPackage[]>=>{
//     const result = (await Package.find().lean())
//     return result;
// }

// const getPackageDetailsFromDB = async(id: string): Promise<IPackage | null>=>{
//     const result = await Package.findById(id);
//     return result;
// }

// export const PackageService = {
//     createPackageToDB,
//     updatePackageToDB,
//     getPackageFromDB,
//     getPackageDetailsFromDB
// }