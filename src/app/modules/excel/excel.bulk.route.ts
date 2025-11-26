import express from 'express';
import { DealerBulkController } from './excel.bulk.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import multer from 'multer';

const router = express.Router();

// Configure multer for Excel file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
});


router.post(
  '/upload',
  auth(USER_ROLES.DELEAR),
  upload.single('file'),
  DealerBulkController.bulkUploadCars
);

/**
 * Download Excel template
 * Only DEALER can access
 */
router.get(
  '/download-template',
  auth(USER_ROLES.DELEAR),
  DealerBulkController.downloadTemplate
);

export const DealerBulkRoutes = router;