import { Document, Model, Types } from 'mongoose'
import { carStatus } from '../../../enums/car-status'

export interface IBasicInformation {
  make?: string
  model?: string
  deviceId?: string
  deviceName?: string
  year?: number
  image: string
  insuranceProof?: string[]
  color?: string
  vin?: string
  tagNumber?: string
  insurancePolicyNumber?: string
}

export interface ITechnicalInformation {
  engineType?: string
  transmission?: string
  // add other fields as needed
}

export interface IElectricHybrid {
  batteryCapacityKWh?: number
  chargingTimeHours?: number
  rangeKm?: number
}

export interface IEquipment {
  hasNavigation?: boolean
  hasCruiseControl?: boolean
  // add more equipment flags
}

export interface IExtras {
  roofRack?: boolean
  towBar?: boolean
}

export interface IColour {
  exterior?: string
  interior?: string
}

export interface ISeatsAndDoors {
  seats?: number
  doors?: number
}

export interface IEnergyAndEnvironment {
  co2EmissionGPerKm?: number
  fuelType?: string
}

export interface IEuroStandard {
  euroClass?: string
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

  user?: Types.ObjectId
  service?: Types.ObjectId
  assignedUsers?: Types.ObjectId[]

  status: keyof typeof carStatus
  miles: number
  totalMiles: number
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