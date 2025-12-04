import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { ICarModel } from './model.interface';
import { CarModel } from './models.model';
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import { BrandModel } from '../subCategory-Brand-Model/subCategory.model';

const createModelTDB = async (payload: ICarModel) => {
  const { model } = payload;
  const isExistName = await CarModel.findOne({ model: model })

  if (isExistName) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "This carModels Name Already Exist");
  }

  const createCategory: any = await CarModel.create(payload)
  if (!createCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create carModels')
  }

  return createCategory
}

const getmodelFromDb = async (): Promise<ICarModel[]> => {
  const result = await CarModel.find({})
  .populate("model", " model image")
  .populate("brand", " brand image")
  return result;
}

const updateModelToDB = async (id: string, payload: ICarModel) => {
  const isExistCategory: any = await CarModel.findById(id);

  if (!isExistCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "carModels doesn't exist");
  }

  const updateCategory = await CarModel.findOneAndUpdate(
    { _id: id },
    payload,
    { new: true }
  )

  return updateCategory
}

const deleteModelToDB = async (id: string): Promise<ICarModel | null> => {
  const deleteCategory = await CarModel.findByIdAndDelete(id)
  if (!deleteCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "carModels doesn't exist")
  }
  return deleteCategory
}



const bulkUpload = async (fileBuffer: Buffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  if (!rows.length) throw new Error("Excel file is empty");

  const createdModels = [];

  for (const row of rows) {
    const brandValue = row.Brand || row.BrandName || row.brand || row.brandName;
    const modelName = row.Model || row.ModelName;

    if (!brandValue || !modelName) continue;

    let brandId;

    if (mongoose.isValidObjectId(brandValue)) {
      brandId = brandValue;
    } 
    else {
      let brand = await BrandModel.findOne({ brand: brandValue.toLowerCase() });

      if (!brand) {
        brand = await BrandModel.create({
          brand: brandValue.toLowerCase(),
        });
      }

      brandId = brand._id;
    }

    const exists = await CarModel.findOne({ model: modelName });
    if (exists) continue;

    const newModel = await CarModel.create({
      brand: brandId,
      model: modelName,
    });

    createdModels.push(newModel);
  }

  return createdModels;
};


export const CarModelService = {
  createModelTDB,
  getmodelFromDb,
  updateModelToDB,
  deleteModelToDB,
  bulkUpload,
}