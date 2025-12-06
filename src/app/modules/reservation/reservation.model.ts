import { Schema, model } from "mongoose";
import { IReservation, ReservationModel } from "./reservation.interface";
import { randomBytes } from "crypto";

const ReservationSchema = new Schema<IReservation, ReservationModel>(
    {
        seller: {
            type: Schema.Types.ObjectId,
            ref: "User",
            role: "SELLER",
            required: false
        },
        buyer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            role: "BUYER",
            required: false
        },
        dealer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            role: "DELEAR",
            required: false
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        
        car: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: false
        },
        name: {
            type:String,
            required:false
        },
        email: {
            type:String,
            required:false
        },
        contactNumber: {
            type: String,
            required: false
        },
        date : {
            type: Date,
            required: false
        },
        status: {
            type: String,
            enum: ["Upcoming", "Confirmed", "Canceled", "Completed"],
            default: "Upcoming",
            required: true
        },

        cancelByCustomer: {
            type: Boolean, 
            default: false
        },
        isReported: {
            type: Boolean,
            default: false
        },


    },
    { timestamps: true }
);


ReservationSchema.pre("save", async function (next) {
    const reservation = this;

    // if (reservation.isNew && !reservation.txid) {
    //     const prefix = "tx_";
    //     const uniqueId = randomBytes(8).toString("hex");
    //     reservation.txid = `${prefix}${uniqueId}`;
    // }

    next();
});

export const Reservation = model<IReservation, ReservationModel>("Reservation", ReservationSchema);