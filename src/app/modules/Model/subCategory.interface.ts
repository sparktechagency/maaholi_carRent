import { Model, Types } from 'mongoose';

export type ISubCategory = {
    brand: Types.ObjectId;
    title: string;
}
export type SubCategoryModel = Model<ISubCategory, Record<string, unknown>>