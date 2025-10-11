import { model } from 'mongoose';
import { Model, Types } from 'mongoose';

export interface ICarModel extends Document {
  brand: Types.ObjectId; 
  model: string;
}
export interface CarModelI extends Model<ICarModel> {}