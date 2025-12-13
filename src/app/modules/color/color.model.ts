
import { Schema, model } from 'mongoose';
import { IColor } from './color.interface';

const colorSchema = new Schema<IColor>(
  {
    color: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

export const ColorModel = model<IColor>('Color', colorSchema);