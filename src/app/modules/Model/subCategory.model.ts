import { model, Schema } from 'mongoose'
import { ISubCategory, SubCategoryModel } from './subCategory.interface'

const subCategorySchema = new Schema<ISubCategory, SubCategoryModel>(
    {
        brand: {
            type: Schema.Types.ObjectId,
            ref: "SubCategory",
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

export const Model = model<ISubCategory, SubCategoryModel>('Model', subCategorySchema)