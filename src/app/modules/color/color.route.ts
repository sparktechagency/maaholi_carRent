import express from 'express';
import { ColorController } from './color.controller';
import { USER_ROLES } from '../../../enums/user'
import auth from '../../middlewares/auth'


const router = express.Router();

router.route('/')
     
    .post(auth(USER_ROLES.SUPER_ADMIN),ColorController.createColor)
    .get(ColorController.getColors);

router.route('/:id')
    .patch(auth(USER_ROLES.SUPER_ADMIN), ColorController.updateColor)
    .delete(auth(USER_ROLES.SUPER_ADMIN), ColorController.deleteColor);

export const ColorRoutes = router;