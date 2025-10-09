import httpStatus, { StatusCodes } from 'http-status-codes';
import { IService } from './service.interface';
import { ServiceModelInstance } from './service.model';
import ApiError from '../../../errors/ApiError';
import fs from 'fs';
import { User } from '../user/user.model';
import path from 'path';
import { logger } from '../../../shared/logger';
import { SubCategory } from '../subCategory/subCategory.model';
import { Day } from '../../../enums/day';
import { isValidDay, to24Hour } from '../../../helpers/find.offer';
import unlinkFile from '../../../shared/unlinkFile';

interface PaginationOptions {
  page: number;
  limit: number;
  searchTerm: string;
  barberId: string;
}

interface PaginatedResult {
  services: IService[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

const unlinkFiles = (files: string[] | string | undefined) => {
  if (!files) return
  if (Array.isArray(files)) {
    files.forEach(f => f && unlinkFile(f))
  } else {
    unlinkFile(files)
  }
}

/**
 * Create service in DB
 */
 export const createServiceToDB = async (payload: Partial<IService>) => {
  const basicInformation = payload.basicInformation

  if (!basicInformation?.image) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'basicInformation.image is required')
  }

  // Build uniqueness filter: VIN > tagNumber > make+model+year
  const uniquenessFilters: any[] = []
  if (basicInformation?.vin) uniquenessFilters.push({ 'basicInformation.vin': basicInformation.vin })
  if (basicInformation?.tagNumber)
    uniquenessFilters.push({ 'basicInformation.tagNumber': basicInformation.tagNumber })
  if (basicInformation?.make || basicInformation?.model || basicInformation?.year) {
    const partial: any = {}
    if (basicInformation.make) partial['basicInformation.make'] = basicInformation.make
    if (basicInformation.model) partial['basicInformation.model'] = basicInformation.model
    if (basicInformation.year) partial['basicInformation.year'] = basicInformation.year
    if (Object.keys(partial).length) uniquenessFilters.push(partial)
  }

  try {
    if (uniquenessFilters.length) {
      const exists = await ServiceModelInstance.findOne({ $or: uniquenessFilters }).lean()
      if (exists) {
        unlinkFiles(basicInformation.image)
        unlinkFiles(basicInformation.insuranceProof)
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Service already exists')
      }
    }

    const created = await ServiceModelInstance.create(payload)
    if (!created) {
      unlinkFiles(basicInformation.image)
      unlinkFiles(basicInformation.insuranceProof)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create service')
    }

    return created.populate({
      path: 'createdBy',
      select: 'firstName lastName profile role status',
    })
  } catch (err) {
    unlinkFiles(basicInformation.image)
    unlinkFiles(basicInformation.insuranceProof)
    throw err
  }
}


const getAllServices = async (pagination: { page: number, totalPage: number, limit: number, total: number }): Promise<{ services: IService[], pagination: { page: number, limit: number, total: number, totalPage: number } }> => {
  const services = await ServiceModelInstance.find()
    .populate('category')
    .populate('title')
    .populate('barber');

  // Use the pagination values from the argument
  const { page, limit, total, totalPage } = pagination;

  return {
    services,
    pagination: {
      page,
      limit,
      total,
      totalPage,
    },
  };
};


// Get all services with pagination and search
const getAllServicesbarber = async ({ page, limit, searchTerm, barberId }: PaginationOptions): Promise<PaginatedResult> => {
  logger.info(`Starting getAllServices: page=${page}, limit=${limit}, searchTerm=${searchTerm}, barberId=${barberId}`);

  // Build query
  const query: any = { barber: barberId }; // Filter by authenticated barber
  if (searchTerm) {
    const subCategoryIds = await SubCategory.find({
      title: { $regex: searchTerm, $options: 'i' }
    }).select('_id');
    
    query.$or = [
      { serviceType: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { title: { $in: subCategoryIds } },
    ];
  }

  try {
    // Calculate pagination
    const total = await ServiceModelInstance.countDocuments(query);
    const totalPage = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch services
    const services = await ServiceModelInstance.find(query)
      .populate('category')
      .populate('title')
      .populate('barber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    logger.info(`Retrieved ${services.length} services, total: ${total}`);
    return {
      services,
      pagination: {
        page,
        limit,
        total,
        totalPage,
      },
    };
  } catch (error) {
    logger.error(`Database error retrieving services: ${error}`);
    throw error;
  }
};

// Update a service
const updateService = async (id: string, payload: Partial<IService>): Promise<IService | null> => {
  const service = await ServiceModelInstance.findById(id);
  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Service not found');
  }

  // Validate barber if provided
  if (payload) {
    const barberExists = await User.findById(payload);
    if (!barberExists) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Barber not found');
    }
  }

  // If updating with new image, delete old image
  if (payload.image && service.image && service.image !== payload.image) {
    const oldImagePath = path.join(process.cwd(), service.image.toString());
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  const updatedService = await ServiceModelInstance.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('category')
    .populate('title')
    .populate('barber');

  return updatedService;
};

// Delete a service
const deleteService = async (id: string): Promise<void> => {
  const service = await ServiceModelInstance.findById(id);
  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Service not found');
  }

  // Delete associated image
  if (service.image) {
    const imagePath = path.join(process.cwd(), service.image.toString());
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await ServiceModelInstance.findByIdAndDelete(id);
};


export const ServiceService = {
  createServiceToDB,
  getAllServices,
  updateService,
  deleteService,
  getAllServicesbarber,
};

