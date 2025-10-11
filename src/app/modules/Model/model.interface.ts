import { Model, Types } from 'mongoose';

export interface ICarModel extends Document {
  brand: Types.ObjectId; 
  title: string;
}
export interface CarModelI extends Model<ICarModel> {}