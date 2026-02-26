import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import { BannerController } from "./banner.controller";
const router = express.Router();

router.route('/')
    .post(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR), 
        fileUploadHandler(), 
        BannerController.createBanner
    )
    .get(
        // auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.OWNER), 
        BannerController.getAllBanner
    );

router.route('/:id')
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR), 
        fileUploadHandler(), 
        BannerController.updateBanner
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR), 
        BannerController.deleteBanner
    );


export const BannerRoutes = router;