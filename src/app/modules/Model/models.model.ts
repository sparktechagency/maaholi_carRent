import { Schema, model } from "mongoose";
import { ICarModel, CarModelI } from "./model.interface";

const CarModelSchema = new Schema<ICarModel, CarModelI>(
  {
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'brand', 
      required: true,
    },
    title: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

export const CarModel = model<ICarModel, CarModelI>('CarModel', CarModelSchema);
