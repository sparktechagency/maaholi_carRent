import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { DealerBulkService } from './excel.bulk.service';
import ApiError from '../../../errors/ApiError';

/**
 * Bulk upload cars from Excel (DEALER only)
 */
const bulkUploadCars = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Excel file is required');
  }

  const result = await DealerBulkService.bulkUploadCarsForDealer(req, req.file);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: `Bulk upload completed: ${result.success} cars added successfully, ${result.failed} failed`,
    data: {
      summary: {
        totalCars: result.totalCars,
        successful: result.success,
        failed: result.failed,
        carsWithinLimit: result.carsWithinLimit,
        adHocCars: result.adHocCars,
        adHocCharges: result.adHocCharges,
        totalMonthlyCost: result.totalCost
      },
      successfulCars: result.successfulCars,
      errors: result.errors
    }
  });
});

/**
 * Download Excel template
 */
const downloadTemplate = catchAsync(async (req: Request, res: Response) => {
  const buffer = DealerBulkService.getExcelTemplate();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=bulk-upload-template.xlsx');
  res.send(buffer);
});

export const DealerBulkController = {
  bulkUploadCars,
  downloadTemplate
};