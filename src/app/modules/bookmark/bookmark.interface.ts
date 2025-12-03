import { Model, Types } from "mongoose";

export type IBookmark= {
    user: Types.ObjectId;
    car: Types.ObjectId;
}

export type BookmarkModel = Model<IBookmark>;