import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { DealerController } from './dealer.controller';
const router = express.Router();

router.post('/discount',
    auth(USER_ROLES.SELLER),
    async (req: Request, res:Response, next: NextFunction) => {
        try {
            req.body = { discount: Number(req.body.discount) };
            next();
        } catch (error) {
            next(error);
        }
    },
    DealerController.makeDiscount
);

router.get('/profile',
    auth(USER_ROLES.SELLER),
    DealerController.DealerDetails
);

// router.get('/offer',
//     DealerController.specialOfferDealer  
// );

// router.get('/',
//     DealerController.getDealerList
// );


// router.get('/recommended',
//     DealerController.recommendedDealer
// );

router.get('/customer/:id',
    DealerController.getDealerProfile
);

router.get('/:id',
    auth(USER_ROLES.SELLER),
    DealerController.getBuyerProfile
);

export const DealerRoutes = router;