
import { Schema, model } from "mongoose";
import { IPackage, PackageModel } from "./package.interface";

const packageSchema = new Schema<IPackage, PackageModel>(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        duration: {
            type: String,
            required: true
        },
        
        OnlineImmediately: {
            type: Boolean,
            default: true,
            required: false
        },
        VisibleToEveryone: {
            type: Boolean,
            default: true,
            required: false
        },

        priceId: {
            type: String,
            required: true
        },
        productId: {
            type: String,
            required: true
        },
        feature: [
            {
                type: String,
                required: true
            }
        ],
        // Role this package is designed for
        targetRole: {
            type: String,
            enum: ["DELEAR", "SELLER"],
            required: true
        },
        carLimit: {
            type: Number,
            required: true,
            default: 4
        },
        adHocPricePerCar: {
            type: Number,
            required: true,
            default: 2.5  
        },
        allowCustomization: {
            type: Boolean,
            default: true  
        }
    },
    {
        timestamps: true
    }
);

export const Package = model<IPackage, PackageModel>("Package", packageSchema);
// const packageSchema = new Schema<IPackage, PackageModel>(
//     {
//         title: {
//             type: String,
//             required: true
//         },
//         description: {
//             type: String,
//             required: true
//         },
//         price: {
//             type: Number,
//             required: true
//         },
//         duration: {
//             type: String,
//             enum: ["month", "year"],
//             required: true
//         },
//         priceId: {
//             type: String,
//             required: true
//         },
//         productId: {
//             type: String,
//             required: true
//         },
//         feature: [
//             {
//                 type: String,
//                 required: true
//             }
//         ],
//         carLimit: {
//             type: Number,
//             required: true,
//             default: 4
//         },
//         adHocPricePerCar: {
//             type: Number,
//             required: true,
//             default: 2.5  // $2.50 per additional car per month
//         }
//     },
//     {
//         timestamps: true
//     }
// )

// export const Package = model<IPackage, PackageModel>("Package", packageSchema);

