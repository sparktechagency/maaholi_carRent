import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IBrand } from './brand.interface'
import { BrandModel } from './brand.model' 
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



const bulkUpload = async (fileBuffer: Buffer, file: Express.Multer.File) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  if (!rows.length) throw new Error("Excel file is empty");

  const createdBrands: any[] = [];
  const skippedRows: any[] = [];

  for (const [index, row] of rows.entries()) {
    const rawBrand = row.Brand || row.brand;
    const modelName = row.Model || row.model || row.ModelName || row.modelName;
    const modelIdValue = row.ModelId || row.modelId;
    const image = row.Image || row.image;

    if (!rawBrand || !modelName) {
      skippedRows.push({ row: index + 2, reason: "Missing brand or model" });
      continue;
    }

    const brandName = rawBrand.toString().trim().toLowerCase();

    // Find or create brand first
    let brand = await BrandModel.findOne({ brand: brandName });
    if (!brand) {
      brand = await BrandModel.create({
        brand: brandName,
        model: null,
        image: image || null,
      });
      createdBrands.push(brand);
      console.log(`✅ Row ${index + 2}: Brand created - ${brandName}`);
    }

    // Resolve model by id or by name (for this brand)
    let resolvedModelId: any = null;

    if (modelIdValue && mongoose.isValidObjectId(modelIdValue)) {
      // try to find model with that id and brand
      const foundById = await CarModel.findOne({ _id: modelIdValue, brand: brand._id });
      if (foundById) {
        resolvedModelId = foundById._id;
      } else {
        // if id not found or doesn't belong to brand, fallback to lookup by name/create
        const carModelByName = await CarModel.findOne({ model: modelName, brand: brand._id });
        if (carModelByName) {
          resolvedModelId = carModelByName._id;
        } else {
          const createdModel = await CarModel.create({ model: modelName, brand: brand._id });
          resolvedModelId = createdModel._id;
          console.log(`✅ Row ${index + 2}: Model created - ${modelName}`);
        }
      }
    } else {
      // lookup by name within brand
let carModel = await CarModel.findOne({ model: modelName, brand: brand._id });

if (!carModel) {
  // Check if this model name already exists under ANY brand
  const existsGlobally = await CarModel.findOne({ model: modelName });
  if (existsGlobally) {
    skippedRows.push({
      row: index + 2,
      reason: `Model "${modelName}" already exists under another brand`
    });
    continue; 
  }
}

  carModel = await CarModel.create({ model: modelName, brand: brand._id });
  console.log(`Row ${index + 2}: Model created - ${modelName}`);
}

    // Update brand with model reference if not already linked
    if (!brand.model) {
      brand.model = resolvedModelId;
      await brand.save();
    }
  }

  console.log(`📊 Bulk upload completed. Brands created: ${createdBrands.length}, Rows skipped: ${skippedRows.length}`);
  return { createdBrands, skippedRows };
};

export const BrandService = {
  createBrandToDB,
  getBrandsFromDB,
  updateBrandToDB,
  deleteBrandToDB,
  getBrandIdByAllmodel,
  bulkUpload,
}
