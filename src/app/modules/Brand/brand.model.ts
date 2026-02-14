import { model, Schema } from 'mongoose'
import { BrandsI, IBrand } from './brand.interface' 

const BrandSchema = new Schema<IBrand, BrandsI>(
  {
    model: {
      type: Schema.Types.ObjectId,
      ref: 'CarModel',
      required: false
    },
    brand: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true 
    },
    image: {
      type: String,
      required: false
    }
  },
  { timestamps: true }
)

export const BrandModel = model<IBrand, BrandsI>('BrandModel', BrandSchema)
