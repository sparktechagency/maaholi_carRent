import express from 'express';
import { USER_ROLES } from '../../../enums/user'
import auth from '../../middlewares/auth'
import validateRequest from '../../middlewares/validateRequest';
import { SubCategoryValidation } from './subCategory.validation';
import { BrandController } from './subCategory.controller';
const router = express.Router()

router.route("/")
    .post(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.SELLER),
        validateRequest(SubCategoryValidation.createSubCategoryZodSchema),
        BrandController.createBrand
    )
    .get(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.SELLER),
        BrandController.getBrand
    );

router.route("/:id")
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
        BrandController.updateBrand
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
        BrandController.deleteBrand
    );

export const SubCategoryRoutes = router