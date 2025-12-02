import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { PackageService } from "./package.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../../shared/sendResponse";

/**
 * Create package (Admin only)
 */
const createPackage = catchAsync(async (req: Request, res: Response) => {
  const result = await PackageService.createPackageToDB(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Package created successfully',
    data: result
  });
});

/**
 * Update package (Admin only)
 */
const updatePackage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PackageService.updatePackageToDB(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Package updated successfully',
    data: result
  });
});


const getAllPackages = catchAsync(async (req: Request, res: Response) => {
    const targetRole = req.query.targetRole;

    let role: string | undefined;

    if (targetRole) {
        const roleCandidate = Array.isArray(targetRole) ? targetRole[0] : targetRole;
        if (typeof roleCandidate === 'string') {
            role = roleCandidate.trim() === '' ? undefined : roleCandidate;
        } else {
            role = undefined;
        }
    }

    const result = await PackageService.getPackageFromDB(role);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Packages retrieved successfully',
        data: result
    });
});

/**
 * Get single package
 */
const getPackageDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PackageService.getPackageDetailsFromDB(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Package details retrieved successfully',
    data: result
  });
});

/**
 * Customize subscription limits (DEALER only)
 * Allows dealer to increase their car limit with custom pricing
 */
const customizeMySubscription = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const { customCarLimit, customAdHocPrice } = req.body;

  const result = await PackageService.customizeSubscriptionLimits(
    userId,
    customCarLimit,
    customAdHocPrice
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Subscription customized successfully',
    data: result
  });
});

export const PackageController = {
  createPackage,
  updatePackage,
  getAllPackages,
  getPackageDetails,
  customizeMySubscription
};
// const createPackage = catchAsync(async(req: Request, res: Response)=>{
//     const result = await PackageService.createPackageToDB(req.body);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Package created Successfully",
//         data: result
//     })
// })

// const updatePackage = catchAsync(async(req: Request, res: Response)=>{
//     const result = await PackageService.updatePackageToDB(req.params.id, req.body);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Package updated Successfully",
//         data: result
//     })
// })

// const getPackage = catchAsync(async(req: Request, res: Response)=>{
//     const result = await PackageService.getPackageFromDB();

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Package Retrieved Successfully",
//         data: result
//     })
// })

// const packageDetails = catchAsync(async(req: Request, res: Response)=>{
//     const result = await PackageService.getPackageDetailsFromDB(req.params.id);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Package Details Retrieved Successfully",
//         data: result
//     })
// })

// export const PackageController = {
//     createPackage,
//     updatePackage,
//     getPackage,
//     packageDetails
// }