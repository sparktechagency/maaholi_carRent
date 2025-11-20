import { Model, Types } from 'mongoose';

export type IBrand = {
    category: Types.ObjectId;
    brand: string;
}
export type BrandsI = Model<IBrand, Record<string, unknown>>