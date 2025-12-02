import { Schema, model } from "mongoose";

const userPackageSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  packageId: {
    type: Schema.Types.ObjectId,
    ref: "Package",
    required: true
  },

  baseCarLimit: {
    type: Number,
    required: true
  },

  extraCars: {
    type: Number,
    default: 0
  },

  extraCarPrice: {
    type: Number,
    required: true
  },

  totalPrice: {
    type: Number,
    required: true
  },

}, { timestamps: true });

export const UserPackage = model("UserPackage", userPackageSchema);