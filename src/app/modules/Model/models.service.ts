import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { ICarModel } from './model.interface';
import { CarModel } from './models.model';


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
  const result = await CarModel.find({}).populate("model", "image")
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




export const CarModelService = {
  createModelTDB,
  getmodelFromDb,
  updateModelToDB,
  deleteModelToDB
}