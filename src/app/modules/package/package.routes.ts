import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { PackageController } from "./package.controller";
import validateRequest from "../../middlewares/validateRequest";
import { PackageValidation } from "./package.validation";
const router = express.Router()

router
    .route("/")
    .post( 
        validateRequest(PackageValidation.createPackageZodSchema), 
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR), 
        PackageController.createPackage
    )
    .get(
        PackageController.getAllPackages
    )

router
    .route("/:id")
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR), 
        PackageController.updatePackage
    )
    .get(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.BUYER, USER_ROLES.SELLER), 
        PackageController.getPackageDetails
    )
router.patch(
    "/:id/customize-my-subscription",
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
    PackageController.customizeMySubscription
);
export const PackageRoutes = router;