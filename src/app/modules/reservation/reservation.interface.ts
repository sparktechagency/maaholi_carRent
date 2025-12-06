import { Model, Types } from "mongoose"

export type IReservation = {
    seller: Types.ObjectId;
    buyer: Types.ObjectId;
    dealer: Types.ObjectId;
    car: Types.ObjectId;
    createdBy: Types.ObjectId;
    status: "Upcoming" | "Accepted" | "Canceled" | "Confirmed" | "Completed";
    name?: string;
    email?: string;
    contactNumber: string;
    date?: Date;
    cancelByCustomer: boolean;
    isReported: boolean;

}

export type ReservationModel = Model<IReservation, Record<string, unknown>>;