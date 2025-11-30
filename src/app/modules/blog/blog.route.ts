import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { BlogController } from "./blog.controller";
import validateRequest from "../../middlewares/validateRequest";
import { BlogValidation } from "./blog.validation";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";

const router = express.Router();

router.route("/")
    .post(
        fileUploadHandler(),
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
     
        // validateRequest(BlogValidation.createBlogZodSchema),
        BlogController.createBlog
    )
    .get(
        BlogController.getAllBlogs
    );
router.route("/:id")
    .get(
        BlogController.getBlogDetails
    )
    .patch(
        fileUploadHandler(),
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
        BlogController.updateBlog
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR),
        BlogController.deleteBlog
    );

export const BlogRoutes = router;