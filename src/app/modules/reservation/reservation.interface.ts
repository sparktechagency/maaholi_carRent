import { Model, Types } from "mongoose"

export type IReservation = {
    seller: Types.ObjectId;
    buyer: Types.ObjectId;
    dealer: Types.ObjectId;
    car: Types.ObjectId;
    status: "Upcoming" | "Accepted" | "Canceled" | "CONFIRMED" | "Completed";
    name?: string;
    email?: string;
    contactNumber: string;
    cancelByCustomer: boolean;
    isReported: boolean;

}

export type ReservationModel = Model<IReservation, Record<string, unknown>>;