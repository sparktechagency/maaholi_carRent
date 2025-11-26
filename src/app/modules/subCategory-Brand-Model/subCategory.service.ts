import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IBrand } from './subCategory.interface'
import { BrandModel } from './subCategory.model' 

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

export const BrandService = {
  createBrandToDB,
  getBrandsFromDB,
  updateBrandToDB,
  deleteBrandToDB
}
