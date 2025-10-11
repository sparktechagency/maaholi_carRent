import { model, Schema } from 'mongoose'
import { BrandsI, IBrand, } from './subCategory.interface'

const BrandScheme = new Schema<IBrand, IBrand>(
    {
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },
        title: {
            type: String,
            required: true,
            unique: true
        }
    },
    { timestamps: true },
)

export const brand = model<IBrand,BrandsI >('brand', BrandScheme)