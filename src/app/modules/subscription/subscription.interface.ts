import { Model, Types } from "mongoose";

export interface ISubscription {
    customerId: string;
    price: number;
    user: Types.ObjectId;
    package: Types.ObjectId;
    trxId: string;
    subscriptionId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    status: "expired" | "active" | "cancel";
    carsAdded: number;
    adHocCharges: number;
    adHocCars: number;
}

export type SubscriptionModel = Model<ISubscription>;