import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { ICarModel } from './model.interface';
import { CarModel } from './models.model';
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import { BrandModel } from '../Brand/brand.model';

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
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

  if (!rows.length) throw new Error("Excel file is empty");

  const createdModels: any[] = [];
  const skippedRows: any[] = [];

  for (const [index, row] of rows.entries()) {
    const brandName = row.Brand || row.brand;
    const modelName = row.Model || row.model;

    if (!brandName || !modelName) {
      skippedRows.push({ row: index + 2, reason: "Brand or model missing" });
      continue;
    }

    // Find or create brand
    let brand = await BrandModel.findOne({ brand: brandName.toLowerCase() });
    if (!brand) {
      brand = await BrandModel.create({ brand: brandName.toLowerCase() });
      console.log(`✅ Row ${index + 2}: Brand created - ${brandName}`);
    }

    // Check if model exists under this brand
    const exists = await CarModel.findOne({ model: modelName.toLowerCase(), brand: brand._id });
    if (exists) {
      skippedRows.push({ row: index + 2, reason: "Model already exists under this brand" });
      continue;
    }

    // Create model with brand id
    const createdModel = await CarModel.create({
      model: modelName.toLowerCase(),
      brand: brand._id
    });
    createdModels.push(createdModel);
    console.log(`✅ Row ${index + 2}: Model created - ${modelName} for brand ${brandName}`);
  }

  return { createdModels, skippedRows };
};

export const CarModelService = {
  createModelTDB,
  getmodelFromDb,
  updateModelToDB,
  deleteModelToDB,
  bulkUpload,
}