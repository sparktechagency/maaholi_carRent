import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

interface IStripeAccountInfo {
    status?: boolean;
    accountId?: string;
    externalAccountId?: string;
    accountUrl?: string;
    currency?: string;
}

interface IAuthenticationProps {
    isResetPassword: boolean;
    otpCode: string;
    expireAt: Date;
}

export type IUser = {
    _id: any;
    name: string;
    appId?: string;
    role: string;
    currentRole: string;
    mobileNumber?: string;
    email?: string;
    password: string;
    isSubscribed?: boolean;
    subscribedPackage?: string;
    expiryDate?: Date;
    // location: {};
    latitude?: number;
    longitude?: number;
    address:string
    about:string
    city:string;
    zipCode:string;
    country:string;
    dateOfBirth:string;
    gender: "Male" | "Female" | "Children" | "Others";
    profile: string;
    tradeLicences?: string[];
    isUpdate: boolean;
    verified: boolean;
    isLocked: boolean;
    discount?: number;
    deviceToken?: string;

    authentication: {
        isResetPassword: boolean;
        oneTimeCode: string;
        expireAt: Date;
    };
    accountInformation?: IStripeAccountInfo;
}

export type UserModal = {
    isExistUserById(id: string): any;
    isExistUserByEmail(email: string): any;
    isAccountCreated(id: string): any;
    isMatchPassword(password: string, hashPassword: string): boolean;
    
} & Model<IUser>;