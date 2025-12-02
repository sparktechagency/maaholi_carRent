import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { SubscriptionController } from "./subscription.controller";
const router = express.Router();

router.get("/my-subscription", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getMySubscription
);
router.get("/history", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getMySubscriptionHistory
);
router.get("/all", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getAllSubscriptions
);
router.get("/:id", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getSubscriptionById
);
router.get("/statistics", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.getMySubscriptionStats
);
router.patch("/customized-subscription", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.DELEAR, USER_ROLES.BUYER, USER_ROLES.SELLER), 
    SubscriptionController.customizeMySubscription
);

export const SubscriptionRoutes = router;