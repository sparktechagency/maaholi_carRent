import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import { Reservation } from '../reservation/reservation.model';
import QueryBuilder from '../../../shared/apiFeature';
import { ServiceModelInstance } from '../service/service.model';
import { Subscription } from '../subscription/subscription.model';

const createAdminToDB = async (payload: IUser): Promise<IUser> => {
    const createAdmin: any = await User.create(payload);
    if (!createAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
    }
    if (createAdmin) {
        await User.findByIdAndUpdate(
            { _id: createAdmin?._id },
            { verified: true },
            { new: true }
        );
    }
    return createAdmin;
};

const deleteAdminFromDB = async (id: any): Promise<IUser | undefined> => {
    const isExistAdmin = await User.findByIdAndDelete(id);
    if (!isExistAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete Admin');
    }
    return;
};

const getAdminFromDB = async (): Promise<IUser[]> => {
    const admins = await User.find({ role: 'ADMIN' })
        .select('name email profile contact location');
    return admins;
};

const countSummaryFromDB = async () => {

    const totalprivateSeller = await User.countDocuments({
        $and: [
            { role: { $nin: ["SUPER-ADMIN", "ADMIN"] } },
            { role: "BUYER" }
        ]
    });

    const totalDealers = await User.countDocuments({
        $and: [
            { role: { $nin: ["SUPER-ADMIN", "ADMIN"] } },
            { role: "SELLER" }
        ]
    });

const totalRevenueAgg = await Subscription.aggregate([
        {
            $match: {
                status: "active"
            }
        },
        {
            $group: {
                _id: null,
                total: {
                    $sum: {
                        $add: ["$price", "$adHocCharges"]   // 👈 ADD BOTH
                    }
                }
            }
        }
    ]);

    // === INCOME (10% of total) ===
    const totalIncomeAgg = await Subscription.aggregate([
        {
            $match: {
                status: "active"
            }
        },
        {
            $group: {
                _id: null,
                total: {
                    $sum: {
                        $add: ["$price", "$adHocCharges"]   // 👈 SAME ADDITION
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalAfterDeduction: { $multiply: ["$total", 0.1] } // 10% FEE
            }
        }
    ]);

    const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg : [{ total: 0 }];
    const totalIncome = totalIncomeAgg.length > 0 ? totalIncomeAgg : [{ totalAfterDeduction: 0 }];

  const  totalUser = await User.countDocuments({
        $and: [
            // { role: { $nin: ["SUPER-ADMIN", "ADMIN"] } },
            { $or: [{ role: "BUYER" }, { role: "SELLER" }, { role: "ADMIN" }, { role: "SUPER-ADMIN" }] }
        ]
    });

    return {
        totalprivateSeller,
        totalDealers,
        totalUser,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalIncome: totalIncome[0]?.totalAfterDeduction || 0
    };

}

// const userStatisticsFromDB = async () => {
//     const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

//     // Initialize user statistics array with 0 counts
//     const userStatisticsArray = Array.from({ length: 12 }, (_, i) => ({
//         month: monthNames[i],
//         dealr: 0,
//         privateSeller: 0,
//     }));

//     const now = new Date();
//     const startOfYear = new Date(now.getFullYear(), 0, 1);
//     const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

//     const usersAnalytics = await User.aggregate([
//         {
//             $match: {
//                 role: { $in: ["SELLER", "BUYER"] },
//                 createdAt: { $gte: startOfYear, $lt: endOfYear }
//             }
//         },
//         {
//             $group: {
//                 _id: {
//                     month: { $month: "$createdAt" },
//                     role: "$role",
//                 },
//                 total: { $sum: 1 }
//             }
//         }
//     ]);

//     // Populate statistics array
//     usersAnalytics.forEach(stat => {
//         const monthIndex = stat._id.month - 1; // Convert month (1-12) to array index (0-11)
//         if (stat._id.role === "BUYER") {
//             userStatisticsArray[monthIndex].dealr = stat.total;
//         } else if (stat._id.role === "SELLER") {
//             userStatisticsArray[monthIndex].privateSeller = stat.total;
//         }
//     });

//     return userStatisticsArray;
// };
const userStatisticsFromDB = async () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const userStatisticsArray = Array.from({ length: 12 }, (_, i) => ({
        month: monthNames[i],
        dealer: 0,     
        privateSeller: 0,  
        allUsers: 0       
    }));

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const usersAnalytics = await User.aggregate([
        {
            $match: {
                createdAt: { $gte: startOfYear, $lt: endOfYear }
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: "$createdAt" },
                    role: "$role"
                },
                total: { $sum: 1 }
            }
        }
    ]);

    usersAnalytics.forEach(stat => {
        const monthIndex = stat._id.month - 1;
        const role = stat._id.role;

        userStatisticsArray[monthIndex].allUsers += stat.total;

        if (role === "BUYER") {
            userStatisticsArray[monthIndex].privateSeller = stat.total;
        }

        if (role === "SELLER") {
            userStatisticsArray[monthIndex].dealer = stat.total;
        }
    });

    return userStatisticsArray;
};
const revenueStatisticsFromDB = async () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const revenueStatisticsArray = Array.from({ length: 12 }, (_, i) => ({
        month: monthNames[i],
        revenue: 0,
        privateSellerRevenue: 0, 
        dealerRevenue: 0          
    }));

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const revenueAnalytics = await Subscription.aggregate([
        {
            $match: {
                status: "active",
                createdAt: { $gte: startOfYear, $lt: endOfYear }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "userData"
            }
        },
        { $unwind: "$userData" },
        {
            $project: {
                month: { $month: "$createdAt" },
                role: "$userData.role",
                totalRevenue: { $add: ["$price", "$adHocCharges"] }
            }
        },
        {
            $group: {
                _id: {
                    month: "$month",
                    role: "$role"
                },
                total: { $sum: "$totalRevenue" }
            }
        }
    ]);

    // Insert into the array
    revenueAnalytics.forEach(stat => {
        const monthIndex = stat._id.month - 1;
        const role = stat._id.role;

        // All combined revenue
        revenueStatisticsArray[monthIndex].revenue += stat.total;

        // Role-wise separation
        if (role === "BUYER") {
            revenueStatisticsArray[monthIndex].privateSellerRevenue = stat.total;
        }
        if (role === "SELLER") {
            revenueStatisticsArray[monthIndex].dealerRevenue = stat.total;
        }
    });

    return revenueStatisticsArray;
};

const userListFromDB = async (query: Record<string, any>) => {
    const result = new QueryBuilder(User.find(), query).filter().search(['name', 'email', 'role']);
    const users = await result.queryModel;

    return { users };
};

// const userListFromDB = async (query: Record<string, any>) => {
//     const result = await User.find({ role: { $ne: "SUPER_ADMIN" } });

//     const users = result;

//     return { users };
// };

const reservationListFromDB = async (query: Record<string, any>) => {
    const result = new QueryBuilder(Reservation.find(), query).paginate().filter();
    const reservations = await result.queryModel.populate([
        {
            path: 'customer',
            select: "name profile"
        },
        {
            path: 'user',
            select: "name profile"
        },
        {
            path: 'service',
            select: "title category",
            populate: [
                {
                path: 'category',
                select: "name"
            }
        ]
        }
    ]);

    const pagination = await result.getPaginationInfo();

    return { reservations, pagination };
};

//total service
// const totalserviceInCar = async () => {

//     const totalcar = await ServiceModelInstance.countDocuments({

//     });


//     const totaldeactive = await ServiceModelInstance.aggregate([
//         {
//             $match: {
//                 isDeleted:true,
//                 // paymentStatus: "Paid"
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 total: { $sum: "$isDeleted" }
//             }
//         }
//     ]);

//     const totalActive = await ServiceModelInstance.aggregate([
//         {
//             $match: {
//                 isDeleted:true
//                 // paymentStatus: "Paid"
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 total: { $sum: "$isDeleted" }
//             }
//         },
//         // {
//         //     $project: {
//         //         _id: 0,
//         //         totalAfterDeduction: { $multiply: ["$total", 0.1] }
//         //     }
//         // }
//     ]);

//     return {
//         totalcar,
//         totaldeactive,
//         totalActive
//         // totalRevenue: totalRevenue[0]?.total || 0,
//         // totalIncome: totalIncome[0]?.totalAfterDeduction || 0
//     };


// }

const totalserviceInCar = async () => {
  // run independent DB ops in parallel
  const [totalcar, totalDeactiveCount, totalActiveCount] = await Promise.all([
    ServiceModelInstance.countDocuments({}),                 // total docs
    ServiceModelInstance.countDocuments({ isDeleted: true }),  // deactivated
    ServiceModelInstance.countDocuments({ isDeleted: false }), // active
  ]);

  return {
    totalcar,
    totalDeactive: totalDeactiveCount,
    totalActive: totalActiveCount,
  };
};

const getTotalSubscribers = async () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Initialize array for 12 months
    const monthlySubscribers = Array.from({ length: 12 }, (_, i) => ({
        month: monthNames[i],
        totalSubscribers: 0
    }));

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    // Aggregate subscriptions grouped by month
    const subscribersData = await Subscription.aggregate([
        {
            $match: {
                status: "active",
                createdAt: { $gte: startOfYear, $lt: endOfYear }
            }
        },
        {
            $project: {
                month: { $month: "$createdAt" }
            }
        },
        
        {
            $group: {
                _id: "$month",
                count: { $sum: 1 }
            }
        }
    ]);

    // Map counts to monthly array
    subscribersData.forEach(stat => {
        const monthIndex = stat._id - 1;
        monthlySubscribers[monthIndex].totalSubscribers = stat.count;
    });

    return monthlySubscribers;
};

export const AdminService = {
    createAdminToDB,
    deleteAdminFromDB,
    getAdminFromDB,
    countSummaryFromDB,
    userStatisticsFromDB,
    revenueStatisticsFromDB,
    userListFromDB,
    reservationListFromDB,
    totalserviceInCar,
    getTotalSubscribers
};
