import { Stripe } from 'stripe';
import { Document, Model, Types } from 'mongoose'
import { carStatus } from '../../../enums/car-status'

  interface IBasicInformation {
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

 interface ITechnicalInformation {
  engineType?: string
  transmission?: string
  fuelType?: string
  driveType?: string
  performance?: string
  engineDisplacement?: string
  cylinders?: string
}

 interface IElectricHybrid {
  batteryCapacityKWh?: number
  chargingTimeHours?: number
  rangeKm?: number
  towingCapacity?: number
  totalWeight?: number
  curbWeight?: number
}

 interface IEquipment {
ABS: { type: Boolean, default: false },
  KeylessEntryStart: { type: Boolean, default: false },
  ParkingAssist: { type: Boolean, default: false },
  SoundSystem: { type: Boolean, default: false },
  ElectricWindows: { type: Boolean, default: false },
  AndroidAuto: { type: Boolean, default: false },
  AppleCarPlay: { type: Boolean, default: false },
  AirConditioning: { type: Boolean, default: false },
  ClimateControl: { type: Boolean, default: false },
  LaneAssist: { type: Boolean, default: false },
  AutomaticBrakeAssist: { type: Boolean, default: false },
  DifferentialLock: { type: Boolean, default: false },
  AlloyWheels: { type: Boolean, default: false },
  CruiseControl: { type: Boolean, default: false },
  AdaptiveCruiseControl: { type: Boolean, default: false },
  StabilityControlESP: { type: Boolean, default: false },
  SeatCovers: { type: Boolean, default: false },
  
  Alcantara: { type: Boolean, default: false },
  FabricSeats: { type: Boolean, default: false },
  LeatherSeats: { type: Boolean, default: false },
  AntiTheftDevice: { type: Boolean, default: false },
  ChromeElements: { type: Boolean, default: false },
  Headlights: { type: Boolean, default: false },
  LaserHeadlights: { type: Boolean, default: false },
  LEDHeadlights: { type: Boolean, default: false },
  XenonHeadlights: { type: Boolean, default: false },
  AdaptiveHeadlights: { type: Boolean, default: false },
  
  Towbar: { type: Boolean, default: false },
  DetachableTowbar: { type: Boolean, default: false },
  SwivelTowbar: { type: Boolean, default: false },
  FixedTowbar: { type: Boolean, default: false },

  HeadUpDisplay: { type: Boolean, default: false },
  Bluetooth: { type: Boolean, default: false },
  Isofix: { type: Boolean, default: false },

  Footboard: { type: Boolean, default: false },
  SpecialPaint: { type: Boolean, default: false },
  SlidingDoor: { type: Boolean, default: false },
  RoofRack: { type: Boolean, default: false },
  GullwingDoors: { type: Boolean, default: false },
  ElectricTailgate: { type: Boolean, default: false },
  RadioDAB: { type: Boolean, default: false },
  ElectricSeatAdjustment: { type: Boolean, default: false },
  FastCharging: { type: Boolean, default: false },
  AuxiliaryHeating: { type: Boolean, default: false },
  BackRest: { type: Boolean, default: false },
  HeatedSeats: { type: Boolean, default: false },
  SportsSeats: { type: Boolean, default: false },
  VentilatedSeats: { type: Boolean, default: false },

  FrontParkingSensors: { type: Boolean, default: false },
  RearParkingSensors: { type: Boolean, default: false },
  CustomMuffler: { type: Boolean, default: false },

  AlarmSystem: { type: Boolean, default: false },
  BlindSpotMonitoring: { type: Boolean, default: false },
  NavigationSystem: { type: Boolean, default: false },
  PortableNavigation: { type: Boolean, default: false },
  StartStopSystem: { type: Boolean, default: false },
  AirSuspension: { type: Boolean, default: false },
  ReinforcedSuspension: { type: Boolean, default: false },
  AdditionalInstruments: { type: Boolean, default: false },
  Camera360: { type: Boolean, default: false },
  RearCamera: { type: Boolean, default: false },
  PanoramicRoof: { type: Boolean, default: false },
  HardTop: { type: Boolean, default: false },
  Sunroof: { type: Boolean, default: false },
  Luggage: { type: Boolean, default: false },
  HandsFree: { type: Boolean, default: false },
}

 interface IExtras {
 tuning?: string
 raceCar?: string
 handicapAccessible?: string
 season?: string
 tires?: string
}

 interface IColour {
  exterior?: string
  metallic?: string
  interior?: string
}

 interface ISeatsAndDoors {
  seats?: number
  doors?: number
}

 interface IEnergyAndEnvironment {
fuelConsumption?: string
coEmissions?: string
energyEfficiencyClass?: string

}

 interface IEuroStandard {
  fuelType?: string,
  transmission?: string,

}

 interface ILocation {
  address?: string
  city?: string
  country?: string
  coordinates?: {
    lat?: number
    lng?: number
  }
}

 interface IService extends Document {
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

  status: carStatus;
  miles: number
  totalMiles: number
  price: number
  isDeleted: boolean

  createdBy: Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}


 interface GetServicesOptions {
  limit?: number;
  page?: number;
  sort?: string; 
  select?: string;
  search?: string;
}

 type ServiceModel = Model<IService, Record<string, unknown>>


 type ICareCompare = {
  user: Types.ObjectId;
  car: Types.ObjectId;
}



export {
  IService,
  ServiceModel,
  GetServicesOptions,
  IBasicInformation,
  ITechnicalInformation,
  IElectricHybrid,
  IEquipment,
  IExtras,
  IColour,
  ISeatsAndDoors,
  IEnergyAndEnvironment,
  IEuroStandard,
  ILocation,
  carStatus,
  ICareCompare,
}
export type CareCompareModel = Model<ICareCompare, Record<string, unknown>>;