import { Model } from "mongoose";


export type IPackage = {
    title: String;
    description: String;
    price: Number;
    adHocPricePerCar: Number;
    duration: 'month' | 'year';
    targetRole: 'DELEAR' | 'SELLER';
    allowCustomization: Boolean;
    OnlineImmediately: Boolean;
    VisibleToEveryone: Boolean;
    feature?: [String];
    priceId: String;
    productId: String;
    carLimit: Number;
}

export type PackageModel = Model<IPackage, Record<string, unknown>>;