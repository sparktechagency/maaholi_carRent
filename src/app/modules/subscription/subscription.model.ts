import { model, Schema } from "mongoose";

const subscriptionSchema = new Schema({
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
        enum: ['pending', 'active', 'expired', 'cancel', 'canceled'],
        default: 'pending'  // ✅ Default should be pending
    },
    price: {
        type: Number,
        required: true
    },
    trxId: {
        type: String,
        required: true
    },
    targetRole: {
        type: String,
        enum: ['DELEAR', 'SELLER', 'BUYER'],
        required: true
    },
    currentPeriodStart: {
        type: Date,
        required: true
    },
    currentPeriodEnd: {
        type: Date,
        required: true
    },
    carsAdded: {
        type: Number,
        default: 0
    },
    customCarLimit: {
            type: Number,  
            default: null
        },
        customAdHocPrice: {
            type: Number,  
            default: null
        },

        adHocCars: {
            type: Number,
            default: 0
        },

        adHocCharges: {
            type: Number,
            default: 0
        },
    
}, {
    timestamps: true
});

subscriptionSchema.methods.getCarLimit = function() {
    return this.customCarLimit ?? this.package.carLimit;
};

// Helper method to get effective ad-hoc price
subscriptionSchema.methods.getAdHocPrice = function() {
    return this.customAdHocPrice ?? this.package.adHocPricePerCar;
};

export const Subscription = model("Subscription", subscriptionSchema);