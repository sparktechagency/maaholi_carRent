import express, { NextFunction, Request, Response } from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ReservationController } from "./reservation.controller";
const router = express.Router();

router.route("/")
    .post(
        auth(USER_ROLES.BUYER,USER_ROLES.SELLER,USER_ROLES.DELEAR,USER_ROLES.SUPER_ADMIN),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { ...othersPayload } = req.body;


                req.body = { ...othersPayload,  buyer: req.user.id };
                next();

            } catch (error) {
                return res.status(500).json({ message: "Failed to Convert string to number" });
            }
        },
        ReservationController.createReservation
    )
    .get(
        auth(USER_ROLES.BUYER,USER_ROLES.SELLER,USER_ROLES.DELEAR,USER_ROLES.SUPER_ADMIN), 
        ReservationController.buyerReservation
    );

router.get("/seller",
    auth(USER_ROLES.SELLER, USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
    ReservationController.sellerReservation
);

router.get("/seller-summery",
    auth(USER_ROLES.SELLER, USER_ROLES.DELEAR,USER_ROLES.SUPER_ADMIN),
    ReservationController.reservationSummerForSeller
);

router.patch("/confirm/:id",
    auth(USER_ROLES.SELLER, USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
    ReservationController.confirmReservation
)

router.route("/:id")
    .get(
        auth(USER_ROLES.SELLER, USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
        ReservationController.reservationDetails
    )
    .patch(
        auth(USER_ROLES.SELLER, USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
        ReservationController.respondedReservation
    )
    .delete(
        auth(USER_ROLES.SELLER, USER_ROLES.DELEAR, USER_ROLES.SUPER_ADMIN),
        ReservationController.cancelReservation
    );


export const ReservationRoutes = router;