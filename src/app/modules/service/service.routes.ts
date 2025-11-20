import { Router } from 'express'
import { ServiceController } from './service.controller'
import fileUploadHandler from '../../middlewares/fileUploaderHandler'
import auth from "../../middlewares/auth";
import { USER_ROLES } from '../../../enums/user'

const router = Router()

// Get service statistics (before /:id routes)
router.get('/stats', ServiceController.getServiceStats)

// Create service with file upload
router.post('/' ,auth(USER_ROLES.USER),fileUploadHandler(), ServiceController.createService)

// Get all services
router.get('/', ServiceController.getAllServices)
router.get('/filter', ServiceController.  getAllFilter)

// Get single service
router.get('/:id', ServiceController.getSingleService)

// Update service with file upload
router.put('/:id', fileUploadHandler(), ServiceController.updateService)

// Update miles only
router.patch('/:id/miles', ServiceController.updateServiceMiles)

// Soft delete
router.delete('/:id', ServiceController.deleteService)

// Permanent delete
router.delete('/:id/permanent', ServiceController.permanentDeleteService)

// Restore service
router.patch('/:id/restore', ServiceController.restoreService)

// Assign users
router.post('/:id/assign-users', ServiceController.assignUsers)

export const ServiceRoutes = router