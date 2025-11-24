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

const createAdminToDB = async (payload: any): Promise<IUser> => {

    // check admin is exist or not;
    const isExistAdmin = await User.findOne({ email: payload.email })
    if (isExistAdmin) {
        throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
    }

    // create admin to db
    const createAdmin = await User.create(payload);
    if (!createAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
    } else {
        await User.findByIdAndUpdate({ _id: createAdmin?._id }, { verified: true }, { new: true });
    }

    return createAdmin;
}


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

    const holderStatus = await ServiceModelInstance.findOne({ user: user.id, status: "Inactive" });

    const totalServiceCount = await Reservation.countDocuments({ customer: user.id, status: "Completed"});

    const totalSpend = await Reservation.aggregate([
        {
            $match: {
                customer: user.id,
                status: "Completed",
                paymentStatus: "Paid"
            }
        },
        {
            $group: {
                _id: null,
                totalSpend: { $sum: "$price" }
            }
        }
    ]);

    const data = {
        ...isExistUser,
        totalServiceCount,
        hold: !!holderStatus,
        totalSpend: totalSpend[0]?.totalSpend || 0
    }

    return data;
};

// const switchRoleService = async (userId: string, newRole: string) => {
//   console.log('=== SWITCH ROLE SERVICE DEBUG ===');
//   console.log('User ID:', userId);
//   console.log('New Role:', newRole);

//   const user = await User.findById(userId);
  
//   console.log('Found user:', user);

//   if (!user) {
//     throw new ApiError(404, "User not found");
//   }

//   // Validate role is allowed
//   const allowedRoles = ['BUYER', 'SELLER', 'ADMIN'];
//   if (!allowedRoles.includes(newRole)) {
//     throw new ApiError(400, "Invalid role");
//   }

//   // Update both role and currentRole
//   user.currentRole = newRole;
//   await user.save();

//   const newAccessToken = jwtHelper.createToken(
//     {
//       id: user._id,
//       email: user.email,
//       role: user.role,
//       currentRole: user.currentRole,
//     },
//     config.jwt.jwt_secret as string,
//     config.jwt.jwt_expire_in as string
//   );

//   return {
//     currentRole: user.currentRole,
//     accessToken: newAccessToken,
//   };
// };
const switchRoleService = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Block admin/super_admin
  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
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

// const updateProfileToDB = async (user: JwtPayload, payload: Partial<IUser>): Promise<Partial<IUser | null>> => {
//     const { id } = user;
//     const isExistUser = await User.isExistUserById(id);
//     if (!isExistUser) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//     }

//     //unlink file here
//     if (payload.profile) {
//         unlinkFile(isExistUser.profile);
//     }
//     if (payload.tradeLicences) {
//         unlinkFile(isExistUser.tradeLicences);
//     }

//     const updateDoc = await User.findOneAndUpdate(
//         { _id: id },
//         payload,
//         { new: true }
//     );
//     return updateDoc;
// };
const updateProfileToDB = async (
  user: JwtPayload, 
  payload: Partial<IUser>
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  
  // Check if user exists
  const existingUser = await User.isExistUserById(id);
  if (!existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // Handle file cleanup for updated files
  const fileFields = ['profile', 'tradeLicences', 'sallonPhoto', 'proofOwnerId'];
  
  for (const field of fileFields) {
    if (payload[field as keyof IUser] && existingUser[field as keyof IUser]) {
      // Unlink old file if new file is being uploaded
      try {
        unlinkFile(existingUser[field as keyof IUser] as string);
      } catch (error) {
        console.error(`Failed to unlink old ${field}:`, error);
        // Don't throw error, just log it as file might not exist
      }
    }
  }

  const userToUpdate = await User.findById(id);
  if (!userToUpdate) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User not found for update!");
  }

  Object.assign(userToUpdate, payload);
  
  const updatedUser = await userToUpdate.save();
  
  // Remove password from response
  const { password, ...userWithoutPassword } = updatedUser.toObject();

  return userWithoutPassword;
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

export const UserService = {
    createUserToDB,
    getUserProfileFromDB,
    updateProfileToDB,
    createAdminToDB,
    updateLocationToDB,
    switchRoleService
};