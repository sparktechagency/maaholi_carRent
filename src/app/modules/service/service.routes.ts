import { Router } from 'express'
import { ServiceController } from './service.controller'
import fileUploadHandler from '../../middlewares/fileUploaderHandler'
import auth from "../../middlewares/auth";
import { USER_ROLES } from '../../../enums/user'
import validateRequest from '../../middlewares/validateRequest';
import { ServiceValidation } from './service.validation';

const router = Router()
router.route('/compare')
  .post(
    auth(USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
    validateRequest(ServiceValidation.createCarCompareZodSchema),
    ServiceController.createCarCompare
  )
  .get(
    auth(USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
    ServiceController.getCarCompare
  );
router.route('/compare/:id')
  .delete(
    auth(USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
    ServiceController.deleteCarCompare
  );
router.get('/stats',
   ServiceController.getServiceStats
  );

router.post('/' ,
  auth(USER_ROLES.SELLER),
  fileUploadHandler(),
   ServiceController.createService
  );

// router.get("/compare/:id1/:id2",
//    ServiceController.compareTwoServices
//   );

router.get(
  '/check-can-add',
  auth(USER_ROLES.SELLER),
  ServiceController.checkCanAddCar
);

router.get(
  '/car-statistics',
  auth(USER_ROLES.SELLER),
  ServiceController.getCarStatistics
);

router.get('/',
   ServiceController.getAllServices
  );
router.get('/filter',
   ServiceController.getAllFilter
  );


// Get single service
router.get('/:id', 
  ServiceController.getSingleService
);

// Update service with file upload
router.put(
  "/:id",
  fileUploadHandler(),
  ServiceController.updateService
);

// Update miles only
router.patch('/:id/miles', 
  ServiceController.updateServiceMiles
);

// Soft delete
router.delete('/:id',
   ServiceController.deleteService
  );

// Permanent delete
router.delete('/:id/permanent', 
  ServiceController.permanentDeleteService
);

// Restore service
router.patch('/:id/restore', 
  ServiceController.restoreService
)



export const ServiceRoutes = router