import { Stripe } from 'stripe';
import { Document, Model, Types } from 'mongoose'
import { carStatus } from '../../../enums/car-status'

export interface IBasicInformation {
  price: any;
  vehicleName: string
  brand?: Types.ObjectId,
  model?: Types.ObjectId,
  Category?: Types.ObjectId,
  vinNo?: string,
  year?: number
  productImage?: string[]
  insuranceProof?: string[]
  tradeLicences?: string[]
  RegularPrice?: number
  OfferPrice?: number
  leasingRate?: string
  condition?: string
  miles?:number
  MfkWarranty?: string
  AccidentVehicle?: string
  BodyType?: string
  tagNumber?: string
  insurancePolicyNumber?: string
}

export interface ITechnicalInformation {
  engineType?: string
  transmission?: string
  fuelType?: string
  driveType?: string
  performance?: string
  engineDisplacement?: string
  cylinders?: string
}

export interface IElectricHybrid {
  batteryCapacityKWh?: number
  chargingTimeHours?: number
  rangeKm?: number
  towingCapacity?: number
  totalWeight?: number
  curbWeight?: number
}

export interface IEquipment {
ABS: { type: Boolean, default: false };
  Camera: { type: Boolean, default: false };
  AdaptiveCruiseControl: { type: Boolean, default: false };
  AlarmSystem: { type: Boolean, default: false };
  ElectricSeatAdjustment: { type: Boolean, default: false };
  Towbar: { type: Boolean, default: false };
  LeatherAlcantaraFabricSeats: { type: Boolean, default: false };
  HeatedVentilatedSeats: { type: Boolean, default: false };
  SunroofPanoramicRoof: { type: Boolean, default: false };
  AndroidAuto: { type: Boolean, default: false };
  NavigationSystem: { type: Boolean, default: false };
  ParkingSensors: { type: Boolean, default: false };
  HeadUpDisplay: { type: Boolean, default: false };
  XenonLEDHeadlights: { type: Boolean, default: false };
  KeylessEntryStart: { type: Boolean, default: false };
  Isofix: { type: Boolean, default: false };
  StartStopSystem: { type: Boolean, default: false };
  TheftProtection: { type: Boolean, default: false };
  ClimateControl: { type: Boolean, default: false };
  SportsSeats: { type: Boolean, default: false };
  SpeedLimiter: { type: Boolean, default: false };
  StabilityControlESP: { type: Boolean, default: false };
  SoundSystem: { type: Boolean, default: false };
}

export interface IExtras {
 tuning?: string
 raceCar?: string
 handicapAccessible?: string
 season?: string
 tires?: string
}

export interface IColour {
  exterior?: string
  metallic?: string
  interior?: string
}

export interface ISeatsAndDoors {
  seats?: number
  doors?: number
}

export interface IEnergyAndEnvironment {
fuelConsumption?: string
coEmissions?: string
energyEfficiencyClass?: string

}

export interface IEuroStandard {
  fuelType?: string,
  transmission?: string,

}

export interface ILocation {
  address?: string
  city?: string
  country?: string
  coordinates?: {
    lat?: number
    lng?: number
  }
}

export interface IService extends Document {
  basicInformation: IBasicInformation
  technicalInformation?: ITechnicalInformation
  electricHybrid?: IElectricHybrid
  equipment?: IEquipment
  extras?: IExtras
  colour?: IColour
  seatsAndDoors?: ISeatsAndDoors
  energyAndEnvironment?: IEnergyAndEnvironment
  euroStandard?: IEuroStandard
  location?: ILocation
  description?: string
  isActive?: boolean;
  user?: Types.ObjectId
  service?: Types.ObjectId
  assignedUsers?: Types.ObjectId[]

  status: string;
  miles: number
  totalMiles: number
  price: number
  isDeleted: boolean

  createdBy: Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

// export type ServiceModel = Model<IService>

export interface GetServicesOptions {
  limit?: number;
  page?: number;
  sort?: string; 
  select?: string;
  search?: string;
}

export type ServiceModel = Model<IService, Record<string, unknown>>