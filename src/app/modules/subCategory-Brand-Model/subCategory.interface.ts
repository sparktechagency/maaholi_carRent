import { Model, Types } from 'mongoose';

export type IBrand = {
    model: Types.ObjectId;
    brand: string;
    image?: string;
}
export type BrandsI = Model<IBrand, Record<string, unknown>>