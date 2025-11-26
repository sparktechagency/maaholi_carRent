import { Model, Types } from 'mongoose';

export type IBrand = {
    model: Types.ObjectId;
    brand: string;
}
export type BrandsI = Model<IBrand, Record<string, unknown>>