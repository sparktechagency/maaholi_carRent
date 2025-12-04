import express from 'express';
import { USER_ROLES } from '../../../enums/user'
import auth from '../../middlewares/auth'
import { BrandController } from './brand.controller';
import fileUploadHandler, { upload } from '../../middlewares/fileUploaderHandler';
const router = express.Router()

router.route("/")
    .post(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.SELLER),
        // validateRequest(SubCategoryValidation.createSubCategoryZodSchema),
        fileUploadHandler(),
        BrandController.createBrand
    )
    .get(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.SELLER, USER_ROLES.BUYER),
        BrandController.getBrand
    );

router.route("/:id")
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
        fileUploadHandler(),
        BrandController.updateBrand
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
        BrandController.deleteBrand
    );
router.get(
    '/models-by-brand/:id',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.SELLER, USER_ROLES.BUYER),
    BrandController.getBrandIdByAllmodel
);
router.post(
  '/bulk-upload',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
  upload.single('file'),
  BrandController.bulkUpload
);

export const BrandRoutes = router