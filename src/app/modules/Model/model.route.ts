import express from 'express';
import { USER_ROLES } from '../../../enums/user'
import auth from '../../middlewares/auth'
import validateRequest from '../../middlewares/validateRequest';
import { SubCategoryValidation } from './models.validation';
import { carModelsController } from './model.controller';
const router = express.Router()

router.route("/")
    .post(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.SELLER),
        validateRequest(SubCategoryValidation.createSubCategoryZodSchema),
        carModelsController.createcarModels
    )
    .get(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.SELLER, USER_ROLES.BUYER),
        carModelsController.getcarModels
    );

router.route("/:id")
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
        carModelsController.updatecarModels
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
        carModelsController.deletecarModels
    );

export const carModelsRoutes = router