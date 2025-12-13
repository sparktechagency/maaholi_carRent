
//create, get, update, delete
import { Request, Response } from 'express';
import { NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IColor } from './color.interface';
import { ColorModel } from './color.model';
import ApiError from '../../../errors/ApiError';

const createColorDB = async (payload: IColor) => {
   const isExistColor = await ColorModel.findOne({ color: payload.color });
   if (isExistColor) {
     throw new ApiError(StatusCodes.CONFLICT, 'This color already exists');
   }
    const color = await ColorModel.create(payload);

    return color;
}

const getColorsFromDB = async (): Promise<IColor[]> => {
    const colors = await ColorModel.find({});
    return colors;
}

const updateColorToDB = async (id: string, payload: Partial<IColor>) => {
    const existing = await ColorModel.findById(id);
    if (!existing) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Color doesn't exist");
    }

    if (payload.color) {
        const conflict = await ColorModel.findOne({ color: payload.color, _id: { $ne: id } }).lean();
        if (conflict) {
            throw new ApiError(StatusCodes.CONFLICT, 'Another color with this color already exists');
        }
    }
    
    const updated = await ColorModel.findByIdAndUpdate(id, payload, { new: true });
    return updated;
}

const deleteColorToDB = async (id: string): Promise<IColor | null> => {
    const deleted = await ColorModel.findByIdAndDelete(id);
    if (!deleted) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Color doesn't exist");
    }
    return deleted;
}

export const ColorService = {
    createColorDB,
    getColorsFromDB,
    updateColorToDB,
    deleteColorToDB,
};