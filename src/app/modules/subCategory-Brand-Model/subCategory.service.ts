import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IBrand } from './subCategory.interface'
import { BrandModel } from './subCategory.model' 
import unlinkFile from '../../../shared/unlinkFile'
import { CarModel } from '../Model/models.model'
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import { model } from 'mongoose';
type CreateBrandDto = Omit<IBrand, '_id' | 'createdAt' | 'updatedAt'> 

const createBrandToDB = async (payload: CreateBrandDto) => {
  const name = payload.brand?.toString().trim().toLowerCase() 
  if (!name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Brand name is required')
  }

  // check existence (case-normalised)
  const exists = await BrandModel.findOne({ brand: name }).lean()
  if (exists) {
    throw new ApiError(StatusCodes.CONFLICT, 'This Brand already exists')
  }

  try {
    const created = await BrandModel.create({ ...payload, brand: name })
    return created
  } catch (err: any) {
    // duplicate key check
    if (err && (err.code === 11000 || err.code === 11001)) {
      throw new ApiError(StatusCodes.CONFLICT, 'This Brand already exists')
    }
    throw err
  }
}

const getBrandsFromDB = async (): Promise<IBrand[]> => {
  // return populated category fields
  const result = await BrandModel.find({}).populate('model', 'model image').lean()
  return result
}

const updateBrandToDB = async (id: string, payload: Partial<CreateBrandDto>) => {
  const existing = await BrandModel.findById(id)

  if (!existing) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Brand doesn't exist")
  }
  if (payload.image && existing.image) {
        unlinkFile(existing.image) // delete old image file;
    }
  if (payload.brand) {
    payload.brand = payload.brand.toString().trim().toLowerCase()
    const conflict = await BrandModel.findOne({ brand: payload.brand, _id: { $ne: id } }).lean()
    if (conflict) {
      throw new ApiError(StatusCodes.CONFLICT, 'Another brand with this name already exists')
    }
  }

  const updated = await BrandModel.findByIdAndUpdate(id, payload, { new: true }).populate('model', 'model image')
  return updated
}

const deleteBrandToDB = async (id: string): Promise<IBrand | null> => {
  const deleted = await BrandModel.findByIdAndDelete(id).lean()
  if (!deleted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Brand doesn't exist")
  }
  return deleted
}
//getbrandIdByAllmodel
const getBrandIdByAllmodel = async (brandId: string) => {
  return await CarModel.find({ brand: brandId })
  .populate("brand", "brand image")
  .lean();
};



const bulkUpload = async (fileBuffer: Buffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  if (!rows.length) throw new Error("Excel file is empty");

  const createdBrands = [];

  for (const row of rows) {
    const brandName = row.Brand || row.brand;
    const modelName = row.ModelName || row.modelName;
    const modelIdValue = row.ModelId || row.modelId;
    const image = row.Image || row.image;

    if (!brandName) continue;

    const existingBrand = await BrandModel.findOne({
      brand: brandName.toLowerCase(),
    });

    if (existingBrand) continue;

    let finalModelId = null;

    if (modelIdValue && mongoose.isValidObjectId(modelIdValue)) {
      finalModelId = modelIdValue;
    }

    else if (modelName) {
      let model = await CarModel.findOne({ model: modelName });

      if (!model) {
        model = await CarModel.create({
          brand: null,
          model: modelName,
        });
      }

      finalModelId = model._id;
    }

    const newBrand = await BrandModel.create({
      brand: brandName.toLowerCase(),
      model: finalModelId || null,
      image: image || null,
    });

    createdBrands.push(newBrand);
  }

  return createdBrands;
};

export const BrandService = {
  createBrandToDB,
  getBrandsFromDB,
  updateBrandToDB,
  deleteBrandToDB,
  getBrandIdByAllmodel,
  bulkUpload,
}
