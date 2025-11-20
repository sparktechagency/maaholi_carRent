import { model, Schema } from 'mongoose'
import { BrandsI, IBrand } from './subCategory.interface' 

const BrandSchema = new Schema<IBrand, BrandsI>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    brand: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true 
    }
  },
  { timestamps: true }
)


export const BrandModel = model<IBrand, BrandsI>('BrandModel', BrandSchema)
