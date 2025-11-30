import express from "express";
import { BookmarkController } from "./bookmark.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import validateRequest from "../../middlewares/validateRequest";
import { BookmarkValidation } from "./bookmark.validation";

const router = express.Router();

router.route("/")
    .post(
        auth(),
        validateRequest(BookmarkValidation.createBookmarkZodSchema),
        BookmarkController.toggleBookmark
    )
    .get(
        auth(),
        BookmarkController.getBookmark
    );

export const BookmarkRoutes = router;
