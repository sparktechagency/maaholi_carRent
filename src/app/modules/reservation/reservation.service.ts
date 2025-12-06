import { JwtPayload } from "jsonwebtoken";
import { IReservation } from "./reservation.interface";
import { Reservation } from "./reservation.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { Report } from "../report/report.model";
import mongoose, { Types } from "mongoose";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import getDistanceFromCoordinates from "../../../shared/getDistanceFromCoordinates";
import getRatingForBarber from "../../../shared/getRatingForBarber";
import { Review } from "../review/review.model";
import { User } from "../user/user.model";
import { ServiceModelInstance } from "../service/service.model";

const createReservationToDB = async (payload: IReservation): Promise<IReservation> => {
    if (!payload.car) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Car ID is required");
    }

    const car = await ServiceModelInstance.findById(new Types.ObjectId(payload.car)).select('createdBy').lean();

    if (!car) throw new ApiError(StatusCodes.NOT_FOUND, "Car not found");

    payload.seller = car.createdBy; 
    payload.dealer = car.createdBy; 
    const isExistReservation = await Reservation.findOne({
        car: new Types.ObjectId(payload.car),
        status: { $in: ["Upcoming", "Confirmed"] }
    });

    if (isExistReservation) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "You already have a booking for this car");
    }

    const reservation = await Reservation.create(payload);

    sendNotifications({
        text: "You have a new reservation request",
        receiver: payload.seller || payload.dealer,
        referenceId: reservation._id,
        screen: "RESERVATION"
    });

    return reservation;
};

const sellerReservationFromDB = async (user: JwtPayload, query: Record<string, any>) => {
    const { page, limit, status } = query;
    const cars = await ServiceModelInstance.find({ createdBy: user.id }).select('_id').lean();
    const carIds = cars.map(car => car._id);
    const condition: any = { car: { $in: carIds } };
    if (status) condition.status = status;

    const pages = parseInt(page as string) || 1;
    const size = parseInt(limit as string) || 10;
    const skip = (pages - 1) * size;

    const reservations = await Reservation.find(condition)
        .populate({ path: 'createdBy', select: 'name email profile' }) 
        .populate({
            path: 'car',
            select: 'basicInformation',
            // strictPopulate: false,
            populate: [
                { path: 'basicInformation.brand', model: 'BrandModel', select: 'brand image' },
                { path: 'basicInformation.model', model: 'CarModel', select: 'model image' }
            ]
        })
        .select('createdBy car status date cancelByCustomer')
        .skip(skip)
        .limit(size)
        .lean();

    const count = await Reservation.countDocuments(condition);

    const allStatus = await Promise.all(
        ['Upcoming', 'Confirmed', 'Canceled', 'Completed'].map(async s => ({
            status: s,
            count: await Reservation.countDocuments({ car: { $in: carIds }, status: s })
        }))
    );

    return {
        data: { reservations, allStatus },
        meta: { page: pages, totalPage: Math.ceil(count / size), total: count, limit: size }
    };
};


const BuyerReservationFromDB = async (user: JwtPayload, query: Record<string, any>) => {
    const { page, limit, status } = query;

    const condition: any = { buyer: user.id };
    if (status) condition.status = status;

    const pages = parseInt(page as string) || 1;
    const size = parseInt(limit as string) || 10;
    const skip = (pages - 1) * size;

    const reservations:any = await Reservation.find(condition)
        .populate({ path: 'buyer', select: 'name email profile address' })
        .populate({
            path: 'car',
            select: 'basicInformation',
            strictPopulate: false,
            populate: [
                { path: 'basicInformation.brand', model: 'BrandModel', select: 'brand image' },
                { path: 'basicInformation.model', model: 'CarModel', select: 'model image' }
            ]
        })
        .select('buyer car createdAt status cancelByCustomer date name email contactNumber')
        .skip(skip)
        .limit(size)
        .lean();

    const reservationsWithExtra = await Promise.all(reservations.map(async (reservation: any) => {
        const review = await Review.findOne({ service: reservation?.car?._id, customer: user.id }).select('rating').lean();
        return { ...reservation, review: review || {} };
    }));

    const count = await Reservation.countDocuments(condition);
    const meta = { page: pages, totalPage: Math.ceil(count / size), total: count, limit: size };

    return { reservations: reservationsWithExtra, meta };
};

const reservationSummerForSellerFromDB = async (user: JwtPayload): Promise<{}> => {

    // total earnings
    const totalEarnings = await Reservation.aggregate([
        {
            $match: { barber: user.id }
        },
        {
            $group: {
                _id: null,
                totalEarnings: { $sum: "$price" }
            }
        }
    ]);

    // total earnings today
    const today = new Date();
    const todayEarnings = await Reservation.aggregate([
        {
            $match: { barber: user.id, createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } }
        },
        {
            $group: {
                _id: null,
                todayEarnings: { $sum: "$price" }
            }
        }
    ]);

    // total reservations today
    const todayReservations = await Reservation.countDocuments(
        {
            barber: user.id,
            createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
        } as any);

    // total reservations
    const totalReservations = await Reservation.countDocuments({ barber: user.id } as any);

    const data = {
        earnings: {
            total: totalEarnings[0]?.totalEarnings || 0,
            today: todayEarnings[0]?.todayEarnings || 0,
        },
        services: {
            today: todayReservations,
            total: totalReservations
        }
    }

    return data;
}


const reservationDetailsFromDB = async (id: string): Promise<{ reservation: IReservation | null, report: any }> => {

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

    const reservation: IReservation | null = await Reservation.findById(id)
        .populate([
            {
                path: 'buyer',
                select: "name profile address"
            },
            {
                path: 'car',
                select: " basicInformation",
                populate: [
                    {
                        path: "basicInformation.brand",
                        select: "brand image"
                    },
                    {
                        path: "basicInformation.model",
                        select: "model image"
                    },
                ]
            }
        ])
        .select("buyer car createdAt status date name email contactNumber cancelByCustomer");
    if (!reservation) throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');

    const report = await Report.findOne({ reservation: id }).select("reason");

    return { reservation, report, };
}


const respondedReservationFromDB = async (id: string, status: string): Promise<IReservation | null> => {

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

    const updatedReservation = await Reservation.findOneAndUpdate(
        { _id: id },
        { status },
        { new: true }
    );
    if (!updatedReservation) throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update reservation');

    if (updatedReservation?.status === "Accepted") {
        const data = {
            text: "Your reservation has been Accepted. Your service will start soon",
            receiver: updatedReservation.buyer,
            referenceId: id,
            screen: "RESERVATION"
        }

        sendNotifications(data);
    }

    if (updatedReservation?.status === "Canceled") {
        const data = {
            text: "Your reservation cancel request has been Accepted.",
            receiver: updatedReservation.buyer,
            referenceId: id,
            screen: "RESERVATION"
        }

        sendNotifications(data);
    }

    return updatedReservation;
}


const cancelReservationFromDB = async (id: string): Promise<IReservation | null> => {

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

    const updatedReservation = await Reservation.findOneAndUpdate(
        { _id: id },
        { cancelByCustomer: true },
        { new: true }
    );

    if (!updatedReservation) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update reservation');
    } else {
        const data = {
            text: "A customer has requested to cancel your reservation",
            receiver: updatedReservation.seller,
            referenceId: id,
            screen: "RESERVATION"
        }
        sendNotifications(data);
    }

    return updatedReservation;
}


const confirmReservationFromDB = async (id: string): Promise<IReservation | null> => {

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

    const updatedReservation:any = await Reservation.findOneAndUpdate(
        { _id: id },
        { status: "Confirmed" },
        { new: true }
    );


    // //check bank account
    // const isExistAccount = await User.findOne({})
    // if (!isExistAccount) {
    //     throw new ApiError(StatusCodes.BAD_REQUEST, "Sorry, Salon didn't provide bank information. Please tell the salon owner to create a bank account");
    // }

    if (updatedReservation) {
        const data = {
            text: "A owner has confirm your reservation",
            receiver: updatedReservation.buyer,
            referenceId: id,
            screen: "RESERVATION"
        }
        sendNotifications(data);
    }

    return updatedReservation;
}


export const ReservationService = {
    createReservationToDB,
    sellerReservationFromDB,
    BuyerReservationFromDB,
    reservationSummerForSellerFromDB,
    reservationDetailsFromDB,
    respondedReservationFromDB,
    cancelReservationFromDB,
    confirmReservationFromDB
}