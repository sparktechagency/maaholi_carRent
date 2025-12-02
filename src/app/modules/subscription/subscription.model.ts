import { model, Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        package: {
            type: Schema.Types.ObjectId,
            ref: 'Package',
            required: true
        },
        customerId: {
            type: String,
            required: true
        },
        subscriptionId: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['active', 'cancelled', 'expired'],
            default: 'active'
        },
        // Base package details
        price: {
            type: Number,
            required: true
        },
        // Custom car limit (only for DEALER)
        customCarLimit: {
            type: Number,  // Overrides package.carLimit if set
            default: null
        },
        // Custom price per car (only for DEALER)
        customAdHocPrice: {
            type: Number,  // Overrides package.adHocPricePerCar if set
            default: null
        },
        // Tracking
        carsAdded: {
            type: Number,
            default: 0
        },
        adHocCars: {
            type: Number,
            default: 0
        },
        adHocCharges: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Helper method to get effective car limit
subscriptionSchema.methods.getCarLimit = function() {
    return this.customCarLimit ?? this.package.carLimit;
};

// Helper method to get effective ad-hoc price
subscriptionSchema.methods.getAdHocPrice = function() {
    return this.customAdHocPrice ?? this.package.adHocPricePerCar;
};

export const Subscription = model("Subscription", subscriptionSchema);