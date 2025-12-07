import { Model, Types } from "mongoose";
import { IPackage } from "../package/package.interface";

 interface ISubscription {
    customerId: string;
    price: number;
    user: Types.ObjectId;
    package: Types.ObjectId | IPackage;
    trxId: string;
    subscriptionId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    status: "expired" | "active" | "cancel";
    carsAdded: number;
    adHocCharges: number;
    adHocCars: number;
    customCarLimit?: number | null;
    customAdHocPrice?: number | null;
    totalMonthlyPrice?: number;
    
    createdAt?: Date;
    updatedAt?: Date;
}

 interface ISubscriptionMethods {
    getCarLimit(): number;
    getAdHocPrice(): number;
    getTotalCost(): number;
    getRemainingSlots(): number;
    canAddCars(count?: number): { 
        canAdd: boolean; 
        willChargeAdHoc?: boolean;
        reason?: string;
    };
}

 interface ISubscriptionModel extends Model<ISubscription, {}, ISubscriptionMethods> {
    findActiveForUser(userId: string): Promise<(ISubscription & ISubscriptionMethods) | null>;
    getStats(userId: string): Promise<{
        carLimit: number;
        carsAdded: number;
        remaining: number;
        percentUsed: number;
        adHocCars: number;
        adHocCharges: number;
        totalCost: number;
        isCustomized: boolean;
        status: string;
    } | null>;
}


export {
    ISubscription,
    ISubscriptionMethods,
    ISubscriptionModel,
    // SubscriptionDocument,
};
export type SubscriptionDocument = ISubscription & ISubscriptionMethods;