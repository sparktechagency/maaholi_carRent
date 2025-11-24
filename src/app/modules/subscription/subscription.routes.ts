import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { SubscriptionController } from "./subscription.controller";
const router = express.Router();

router.get("/details", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.subscriptionDetails
);
router.get("/history", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getSubscriptionHistory
);
router.get("/all", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getAllSubscriptions
);
router.get("/:id", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getSubscriptionById
);
router.get("/statistics", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getSubscriptionStats
);


export const SubscriptionRoutes = router;