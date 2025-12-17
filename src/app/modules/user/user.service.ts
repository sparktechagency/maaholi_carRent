import { USER_ROLES } from '../../../enums/user';
import { IUser } from "./user.interface";
import { JwtPayload } from 'jsonwebtoken';
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import generateOTP from "../../../util/generateOTP";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";
import unlinkFile from "../../../shared/unlinkFile";
import { Reservation } from "../reservation/reservation.model";
import { ServiceModelInstance } from "../service/service.model";
import { sendTwilioOTP } from "../../../helpers/twillo";
import { formatPhoneNumber } from "../../../helpers/formatedPhoneNumber";
import { AppError } from "../../../errors/error.app";
import { object } from "zod";
import config from '../../../config';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { ILoginData } from '../../../types/auth';
import Stripe from 'stripe';

const stripe = new Stripe(config.stripe.stripeSecretKey as string);
import { CACHE_PREFIXES, RedisCacheService, CACHE_TTL } from '../redis/cache';
import { Subscription } from '../subscription/subscription.model';

const createAdminToDB = async (payload: any): Promise<IUser> => {
    const isExistAdmin = await User.findOne({ email: payload.email });
    if (isExistAdmin) {
        throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
    }

    const createAdmin = await User.create(payload);
    if (!createAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
    }

    const updatedAdmin = await User.findByIdAndUpdate(
        createAdmin._id,
        { verified: true },
        { new: true } 
    );

    return updatedAdmin!; 
};
const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  console.log('=== CREATE USER DEBUG ===');
  console.log('Payload email:', payload.email);

const createUser = await User.create({
  ...payload,
  role: payload.role,
  currentRole: payload.role
});

  console.log('User created with ID:', createUser._id);
  console.log('User created with email:', createUser.email);

  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  const otp = generateOTP();
  console.log('Generated OTP:', otp);

  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };

  // Update with OTP
  const updatedUser = await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } },
    { new: true }
  ).select('+authentication');

  console.log('User after OTP update:', updatedUser);
  console.log('Authentication saved:', updatedUser?.authentication);

  // Send email...
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!
  };
  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  return createUser;
};

const getUserProfileFromDB = async (user: JwtPayload): Promise<Partial<IUser>> => {
    const { id } = user;
    const isExistUser: any = await User.findById(id).lean();
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    delete isExistUser.sallonPhoto;
    delete isExistUser.proofOwnerId;
    delete isExistUser.password;
    delete isExistUser.authentication;
//populate subscribedPackage
    await User.populate(isExistUser, { path: 'subscribedPackage' });
    

    const data = {
        ...isExistUser,
      
    }

    return data;
};

const switchRoleService = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Block admin/super_admin
  if (user.role === USER_ROLES.DELEAR || user.role === USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(400, "Admin or Super Admin role cannot be switched.");
  }

  // Swap roles
  const previousRole = user.role;
  const newRole =
    previousRole === USER_ROLES.BUYER ? USER_ROLES.SELLER : USER_ROLES.BUYER;

  user.role = newRole;
  user.currentRole = newRole; // keep currentRole in sync with permanent role
  await user.save();

  const newAccessToken = jwtHelper.createToken(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      // currentRole: user.previousRole,
    },
    config.jwt.jwt_secret as string,
    config.jwt.jwt_expire_in as string
  );

  return {
    role: user.role,
    // previousRole: user.previousRole,
    accessToken: newAccessToken,
  };
};

const updateProfileToDB = async (user: JwtPayload, payload: Partial<IUser>): Promise<Partial<IUser | null>> => {
    const { id } = user;
    
    const isExistUser = await User.isExistUserById(id);
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    
    console.log('Existing user data:', {
        profile: isExistUser.profile,
        tradeLicences: isExistUser.tradeLicences
    }); 
    
    console.log('Payload:', payload); 
    
    if (payload.profile && isExistUser.profile && typeof isExistUser.profile === 'string') {
        unlinkFile(isExistUser.profile);
    }
    
    if (payload.tradeLicences && Array.isArray(payload.tradeLicences) && payload.tradeLicences.length > 0) {
        if (isExistUser.tradeLicences && Array.isArray(isExistUser.tradeLicences)) {
            isExistUser.tradeLicences.forEach((file: string) => {
                if (file && typeof file === 'string') {
                    unlinkFile(file);
                }
            });
        } else if (isExistUser.tradeLicences && typeof isExistUser.tradeLicences === 'string') {
            unlinkFile(isExistUser.tradeLicences);
        }
    }
    
  

    delete payload.password;
    delete payload.authentication;
    
    const updateDoc = await User.findOneAndUpdate(
        { _id: id },
        { $set: payload }, 
        { new: true, runValidators: true } 
    ).select('-password -authentication'); 
    
    console.log('Updated document:', updateDoc);
    
    return updateDoc;
};
const updateLocationToDB = async (user: JwtPayload, payload: { longitude: number; latitude: number }): Promise<IUser | null> => {

    const result = await User.findByIdAndUpdate(
        user.id,
        {
            $set: {
                "location.type": "Point",
                "location.coordinates": [payload.longitude, payload.latitude]
            }
        },
        { new: true }
    );

    if (!result) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Failed to update user location");
    }

    return result;
};

 const toggleUserLock = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }

    user.isLocked = !user.isLocked;
    await user.save();

    return user;
};

const getDealerCompleteProfile = async (dealerId: string) => {
  if (!dealerId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Dealer ID is required');
  }

  const cacheKey = `${CACHE_PREFIXES.USER_PROFILE}:dealer:${dealerId}`;
  const cached = await RedisCacheService.get<any>(cacheKey);
  
  if (cached) {
    console.log('[Dealer Profile] Returning cached data');
    return cached;
  }

  console.log('[Dealer Profile] Cache miss, querying database');

  const dealer = await User.findById(dealerId)
    .select('-password -authentication')
    .lean();

  if (!dealer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Dealer not found');
  }

  if (dealer.role !== USER_ROLES.DELEAR) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'This endpoint is only for DEALER role'
    );
  }

  let subscriptionDetails: any = null;
  let stripeSubscriptionDetails: any = null;

  const subscription = await Subscription.findOne({ user: dealerId })
    .populate('package', 'title description price duration carLimit adHocPricePerCar feature')
    .sort({ createdAt: -1 })
    .lean();

  if (subscription) {
    subscriptionDetails = subscription;

    if (subscription.subscriptionId && subscription.subscriptionId !== 'pending') {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscriptionId);
        stripeSubscriptionDetails = {
          status: stripeSubscription.status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
          created: new Date(stripeSubscription.created * 1000),
          daysUntilDue: stripeSubscription.days_until_due,
        };
      } catch (error: any) {
        console.error('[Dealer Profile] Error fetching Stripe details:', error.message);
      }
    }
  }

  const cars = await ServiceModelInstance.find({ createdBy: dealerId, isDeleted: false })
    .populate('basicInformation.brand', 'name logo')
    .populate('basicInformation.model', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const totalCars = cars.length;
  
  const carsByStatus = cars.reduce((acc: any, car: any) => {
    acc[car.status] = (acc[car.status] || 0) + 1;
    return acc;
  }, {});

  const totalInventoryValue = cars.reduce((sum: number, car: any) => 
    sum + (car.basicInformation?.OfferPrice || 0), 0
  );

  const carsByCondition = cars.reduce((acc: any, car: any) => {
    const condition = car.basicInformation?.condition || 'Unknown';
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {});
  const carsByFuelType = cars.reduce((acc: any, car: any) => {
    const fuelType = car.technicalInformation?.fuelType || 'Unknown';
    acc[fuelType] = (acc[fuelType] || 0) + 1;
    return acc;
  }, {});

  const carsByBodyType = cars.reduce((acc: any, car: any) => {
    const bodyType = car.basicInformation?.BodyType || 'Unknown';
    acc[bodyType] = (acc[bodyType] || 0) + 1;
    return acc;
  }, {});

  const recentCars = cars.slice(0, 10);

  const mostExpensiveCars = [...cars]
    .sort((a: any, b: any) => 
      (b.basicInformation?.OfferPrice || 0) - (a.basicInformation?.OfferPrice || 0)
    )
    .slice(0, 5)
    .map((car: any) => ({
      _id: car._id,
      vehicleName: car.basicInformation?.vehicleName,
      brand: car.brand,
      model: car.model,
      year: car.basicInformation?.year,
      price: car.basicInformation?.OfferPrice,
      image: car.basicInformation?.productImage?.[0],
      status: car.status
    }));

  let subscriptionUsage: any = null;

  if (subscription) {
    const packageData: any = subscription.package;
    const carLimit = packageData?.carLimit || 4;
    const carsAdded = subscription.carsAdded || 0;
    const adHocCars = subscription.adHocCars || 0;
    const adHocCharges = subscription.adHocCharges || 0;

    subscriptionUsage = {
      packageLimit: carLimit,
      carsAdded: carsAdded,
      carsWithinLimit: Math.min(carsAdded, carLimit),
      adHocCars: adHocCars,
      adHocCharges: adHocCharges,
      remainingFreeSlots: Math.max(0, carLimit - carsAdded),
      utilizationPercentage: ((carsAdded / carLimit) * 100).toFixed(2),
      monthlyCost: {
        baseSubscription: subscription.price,
        adHocCharges: adHocCharges,
        total: subscription.price + adHocCharges
      }
    };
  }

  const result = {
    profile: {
      _id: dealer._id,
      name: dealer.name,
      email: dealer.email,
      mobileNumber: dealer.mobileNumber,
      role: dealer.role,
      profile: dealer.profile,
      about: dealer.about,
      address: dealer.address,
      location: dealer.address,
      verified: dealer.verified,
      isSubscribed: dealer.isSubscribed,

      isUpdate: dealer.isUpdate,
      accountInformation: dealer.accountInformation,

    },

    subscription: subscriptionDetails ? {
      _id: subscriptionDetails._id,
      package: subscriptionDetails.package,
      status: subscriptionDetails.status,
      price: subscriptionDetails.price,
      carsAdded: subscriptionDetails.carsAdded,
      adHocCars: subscriptionDetails.adHocCars,
      adHocCharges: subscriptionDetails.adHocCharges,
      currentPeriodStart: subscriptionDetails.currentPeriodStart,
      currentPeriodEnd: subscriptionDetails.currentPeriodEnd,
      subscriptionId: subscriptionDetails.subscriptionId,
      customerId: subscriptionDetails.customerId,
      createdAt: subscriptionDetails.createdAt,
      stripeDetails: stripeSubscriptionDetails
    } : null,

    // Subscription Usage
    subscriptionUsage,

    // All Cars
    cars: {
      total: totalCars,
      data: cars,
      recentCars,
      mostExpensiveCars
    },

    // Statistics
    statistics: {
      totalCars,
      carsByStatus,
      carsByCondition,
      carsByFuelType,
      carsByBodyType,
      totalInventoryValue,
      averageCarPrice: totalCars > 0 ? (totalInventoryValue / totalCars).toFixed(2) : 0
    },

    // Financial Overview
    financialOverview: subscriptionUsage ? {
      monthlySubscriptionCost: subscriptionUsage.monthlyCost.total,
      potentialRevenue: totalInventoryValue,
      costPerCar: totalCars > 0 ? (subscriptionUsage.monthlyCost.total / totalCars).toFixed(2) : 0,
      revenueToSubscriptionRatio: subscriptionUsage.monthlyCost.total > 0 
        ? (totalInventoryValue / subscriptionUsage.monthlyCost.total).toFixed(2) 
        : 0
    } : null
  };

  await RedisCacheService.set(cacheKey, result, { ttl: CACHE_TTL.SHORT });

  return result;
};


const getDealerCarInventory = async (dealerId: string, filters?: any) => {
  const { status, condition, fuelType, priceFrom, priceTo, page = 1, limit = 20 } = filters || {};

  // Build query
  const query: any = { createdBy: dealerId, isDeleted: false };

  if (status) query.status = status;
  if (condition) query['basicInformation.condition'] = condition;
  if (fuelType) query['technicalInformation.fuelType'] = fuelType;
  
  if (priceFrom || priceTo) {
    query['basicInformation.OfferPrice'] = {};
    if (priceFrom) query['basicInformation.OfferPrice'].$gte = Number(priceFrom);
    if (priceTo) query['basicInformation.OfferPrice'].$lte = Number(priceTo);
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);

  const [cars, total] = await Promise.all([
    ServiceModelInstance.find(query)
      .populate('basicInformation.brand', 'brand logo')
      .populate('basicInformation.model', 'name')
      .populate('basicInformation.Category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ServiceModelInstance.countDocuments(query)
  ]);

  return {
    cars,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  };
};



const getDealerSubscriptionHistory = async (dealerId: string) => {
  const subscriptions = await Subscription.find({ user: dealerId })
    .populate('package', 'title price duration carLimit')
    .sort({ createdAt: -1 })
    .lean();

  const summary = {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
    totalSpent: subscriptions.reduce((sum, s) => sum + s.price + (s.adHocCharges || 0), 0),
    totalCarsAdded: subscriptions.reduce((sum, s) => sum + (s.carsAdded || 0), 0),
    totalAdHocCharges: subscriptions.reduce((sum, s) => sum + (s.adHocCharges || 0), 0)
  };

  return {
    subscriptions,
    summary
  };
};


const getDealerDashboard = async (dealerId: string) => {
  const [profile, cars, subscription] = await Promise.all([
    User.findById(dealerId).select('name email profile isSubscribed').lean(),
    ServiceModelInstance.countDocuments({ createdBy: dealerId, isDeleted: false }),
    Subscription.findOne({ user: dealerId, status: 'active' }).populate('package').lean()
  ]);

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Dealer not found');
  }

  // Quick stats
  const [activeCars, pendingCars, soldCars] = await Promise.all([
    ServiceModelInstance.countDocuments({ createdBy: dealerId, status: 'ACTIVE', isDeleted: false }),
    ServiceModelInstance.countDocuments({ createdBy: dealerId, status: 'PENDING', isDeleted: false }),
    ServiceModelInstance.countDocuments({ createdBy: dealerId, status: 'SOLD', isDeleted: false })
  ]);

  return {
    dealer: profile,
    quickStats: {
      totalCars: cars,
      activeCars,
      pendingCars,
      soldCars
    },
    subscription: subscription ? {
      package: (subscription.package as any)?.title,
      status: subscription.status,
      carsAdded: subscription.carsAdded,
      carLimit: (subscription.package as any)?.carLimit,
      adHocCars: subscription.adHocCars,
      monthlyCost: subscription.price + (subscription.adHocCharges || 0)
    } : null
  };
};

const getallDealerDB = async (): Promise<IUser[]> => {
    const allDealers = await User.find({ role: USER_ROLES.DELEAR }).select('-password -authentication').lean();
    return allDealers;
};

const getAllCarIdByDealerDB = async (dealerId: string) => {
  const cars = await ServiceModelInstance
    .find({ createdBy: dealerId, isDeleted: false })
    .select(
      'basicInformation technicalInformation equipment electricHybrid extras colour seatsAndDoors energyAndEnvironment euroStandard  location description status createdAt updatedAt'
    )
    .lean();

  return cars;
};

export const UserService = {
    createUserToDB,
    getUserProfileFromDB,
    updateProfileToDB,
    createAdminToDB,
    updateLocationToDB,
    switchRoleService,
    toggleUserLock,
    getDealerCarInventory,
    getDealerSubscriptionHistory,
    getDealerDashboard,
    getDealerCompleteProfile,
    getallDealerDB,
    getAllCarIdByDealerDB
  
};