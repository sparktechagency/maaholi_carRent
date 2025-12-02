import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IBookmark } from "./bookmark.interface";
import { Bookmark } from "./bookmark.model";
import { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import getDistanceFromCoordinates from "../../../shared/getDistanceFromCoordinates";
import { Review } from "../review/review.model";
import getBarberCategory from "../../../shared/getCategoryForBarber";
import getRatingForBarber from "../../../shared/getRatingForBarber";
import QueryBuilder from "../../../shared/apiFeature";

const toggleBookmark = async (payload:IBookmark): Promise<string> => {

    const existingBookmark = await Bookmark.findOne({
        user: payload.user,
        car: payload.car
    });

    if (existingBookmark) {
        await Bookmark.findByIdAndDelete(existingBookmark._id);
        return "Bookmark Remove successfully";
    } else {
        const result = await Bookmark.create(payload);
        if (!result) {
            throw new ApiError(StatusCodes.EXPECTATION_FAILED, "Failed to add bookmark");
        }
        return "Bookmark Added successfully";
    }
};

const getBookmark = async (user: JwtPayload, query: Record<string, any>) => {
    const bookMarkQuery = new QueryBuilder(
        Bookmark.find({ user: user.id }).populate({
            path: 'car',
            populate: [
                { path: 'createdBy', select: 'name email profile location address' },
                { path: 'location' },

                { path: 'basicInformation.brand', select: 'brand image' },
                { path: 'basicInformation.model', select: 'model year image' },

            ],
        }),
        query
    ).paginate();

    const [data, pagination] = await Promise.all([
        bookMarkQuery.queryModel.lean(),
        bookMarkQuery.getPaginationInfo(),
    ]);

    return {
        data,
        pagination,
    };
};

export const BookmarkService = { toggleBookmark, getBookmark }