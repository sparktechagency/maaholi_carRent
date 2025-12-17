import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
const router = express.Router();

router.get(
    '/profile',
    auth(USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN, USER_ROLES.SELLER, USER_ROLES.BUYER),
    UserController.getUserProfile
);

router.get(
    '/all-dealers',
    UserController.getallDealer
);
router.get(
    '/cars-by-dealer/:dealerId',
    UserController.getAllCarIdByDealer
);
router.patch('/update-location',
    auth(USER_ROLES.SELLER, USER_ROLES.BUYER),
    UserController.updateLocation
  );
  
router.patch("/switch-role",
        auth(USER_ROLES.BUYER, USER_ROLES.SELLER),
        UserController.switchRole
    );
    
router.post(
    '/create-admin',
    validateRequest(UserValidation.createAdminZodSchema),
    UserController.createAdmin
);

router
    .route('/')
    .post(
        UserController.createUser
    )
    .patch(
        auth(USER_ROLES.
            DELEAR, USER_ROLES.SUPER_ADMIN, USER_ROLES.SELLER, USER_ROLES.BUYER),
        fileUploadHandler(),
        UserController.updateProfile
    );

router.patch(
    '/toggle-user-lock/:id',
    auth(USER_ROLES.
        DELEAR, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    UserController.toggleUserLock
);

router.get(
  '/my-profile',
  auth(USER_ROLES.DELEAR),
  UserController.getMyProfile
);

// Get own dashboard
router.get(
  '/dashboard',
  auth(USER_ROLES.DELEAR,USER_ROLES.SUPER_ADMIN),
  UserController.getDealerDashboard
);

// Get own car inventory
router.get(
  '/my-inventory',
  auth(USER_ROLES.DELEAR),
  UserController.getDealerCarInventory
);

// Get own subscription history
router.get(
  '/my-subscription-history',
  auth(USER_ROLES.DELEAR),
  UserController.getDealerSubscriptionHistory
);


router.get(
  '/profile/:dealerId',
  auth(USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
  UserController.getDealerCompleteProfile
);


router.get(
  '/inventory/:dealerId',
  auth(USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
  UserController.getDealerCarInventory
);

router.get(
  '/subscription-history/:dealerId',
  auth(USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
  UserController.getDealerSubscriptionHistory
);
export const UserRoutes = router;