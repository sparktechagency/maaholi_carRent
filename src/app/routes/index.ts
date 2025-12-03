import express from 'express';
import { UserRoutes } from '../modules/user/user.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { BookmarkRoutes } from '../modules/bookmark/bookmark.routes';
import { CategoryRoutes } from '../modules/category/category.route';
import { RuleRoutes } from '../modules/rule/rule.route';
import { FaqRoutes } from '../modules/faq/faq.route';
import { AdminRoutes } from '../modules/admin/admin.route';
import { ChatRoutes } from '../modules/chat/chat.route';
import { MessageRoutes } from '../modules/message/message.route';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { PackageRoutes } from '../modules/package/package.routes';
import { ReviewRoutes } from '../modules/review/review.routes';
import { ServiceRoutes } from '../modules/service/service.routes';
import { SubCategoryRoutes } from '../modules/subCategory-Brand-Model/subCategory.route';
import { PortfolioRoutes } from '../modules/portfolio/portfolio.route';
import { DealerRoutes } from '../modules/dealer/dealer.routes';
import { ReservationRoutes } from '../modules/reservation/reservation.routes';
import { ReportRoutes } from '../modules/report/report.routes';
import { PaymentRoutes } from '../modules/payment/payment.routes';
import { OfferRoutes } from '../modules/offer/offer.routes';
import { carModelsRoutes } from '../modules/Model/model.route';
import { SubscriptionRoutes } from '../modules/subscription/subscription.routes';
import { DealerBulkRoutes } from '../modules/excel/excel.bulk.route';
import { ContactRoutes } from '../modules/contact/contact.route';
import { BlogRoutes } from '../modules/blog/blog.route';
const router = express.Router();

const apiRoutes = [
    { path: "/user", route: UserRoutes },
    { path: "/auth", route: AuthRoutes },
    { path: "/admin", route: AdminRoutes },
    { path: "/bookmark", route: BookmarkRoutes },
    { path: "/category", route: CategoryRoutes },
    { path: "/brand", route: SubCategoryRoutes },
    { path: "/models", route: carModelsRoutes },
    { path: "/rule", route: RuleRoutes },
    { path: "/faq", route: FaqRoutes },
    { path: "/chat", route: ChatRoutes },
    { path: "/message", route: MessageRoutes },
    { path: "/notification", route: NotificationRoutes },
    { path: "/package", route: PackageRoutes },
    { path: "/review", route: ReviewRoutes },
    { path: "/car", route: ServiceRoutes },
    { path: "/bulk", route: DealerBulkRoutes },
    { path: "/portfolio", route: PortfolioRoutes },
    { path: "/dealer", route: DealerRoutes },
    { path: "/reservation", route: ReservationRoutes },
    { path: "/report", route: ReportRoutes },
    { path: "/payment", route: PaymentRoutes },
    { path: "/subscription", route: SubscriptionRoutes },
    { path: "/offer", route: OfferRoutes },
    {
        path:"/contact",
        route:ContactRoutes
    },
    {
        path:"/blog",
        route:BlogRoutes
    }
]

apiRoutes.forEach(route => router.use(route.path, route.route));
export default router;