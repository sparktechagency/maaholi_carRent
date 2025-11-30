import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ContactController } from "./contact.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ContactValidation } from "./contact.validation";
const router = express.Router();

router
    .route("/")
    .post( 
        validateRequest(ContactValidation.createContactZodValidation), 
        ContactController.createContact
    )
    .get(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR), 
        ContactController.getAllContacts
    )
router
    .route("/:id")
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR), 
        ContactController.deleteContact
    )

export const ContactRoutes = router;