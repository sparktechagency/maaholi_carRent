import { Model } from "mongoose";

export type IBlog = {
    title: string;
    type:string,
    description: string;
    image: string;
    tags: string[];
}

export type BlogModel = Model<IBlog, Record<string, unknown>>;