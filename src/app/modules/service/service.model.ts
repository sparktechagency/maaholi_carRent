import { HydratedDocument, Model, model, Schema, Types } from 'mongoose'
import { CareCompareModel, ICareCompare, IService, ServiceModel } from './service.interface'
import { carStatus } from '../../../enums/car-status'

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    basicInformation: {
      vehicleName: { type: String, required: false },
         
      brand: { 
            type: Schema.Types.ObjectId,
            ref: "BrandModel",
            required: false 
          },
      model: { 
            type: Schema.Types.ObjectId,
            ref: "CarModel",
            required: false 
          },
      Category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: false 
      },
      vinNo: { type: String, required: false },
      year: { type: Number, required: false },
      productImage: { type: [String], required: false },
      RegularPrice: { type: Number, required: false},
      OfferPrice: { type: Number, required: false},
      leasingRate: {type: String, required: false},
      condition: { type: String, required: false },
      miles: { type: Number, default: 0 },
      MfkWarranty: { type: String, required:false},
      AccidentVehicle: {type: String, required: false},
      BodyType: {type: String, required: false},
      insuranceProof:{type: [String], required: false},
      tradeLicences:{type: [String], required: false}
    },

    // Category: Technical Information
    technicalInformation: {
      fuelType:{type: String, required: false},
      driveType: {type: String, required: false},
      transmission: {type: String, required: false},
      engineType: { type: String, required: false },
      performance: { type: String, required: false },
      engineDisplacement: { type: String, required: false },
      cylinders: { type: String, required: false },

    },

    electricHybrid: {
      batteryCapacityKWh: { type: Number, required: false },
      chargingTimeHours: { type: Number, required: false },
      rangeKm: { type: Number, required: false },
      towingCapacity:  { type: Number, required: false },
      totalWeight:  { type: Number, required: false },
      curbWeight:  { type: Number, required: false },
    },

equipment: {
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
},

    extras: {
      tires:{ type: String, required: false},
      season:{ type: String, required: false},
      handicapAccessible:{ type: String, required: false},
      raceCar:{ type: String, required: false},
      tuning:{ type: String, required: false},

    },

    colour: {
      metallic: {
        type: String, 
        required: false
      },
      exterior: { 
        type: [String],
         required: false 
        },
      interior: { 
        type: [String], 
        required: false 
      },
    },

    // Category: Seats & Doors
    seatsAndDoors: {
      seats: { type: Number, required: false },
      doors: { type: Number, required: false },
    },

    // Category: Energy & Environment
    energyAndEnvironment: {
      fuelConsumption:{ type: String,  required: false},
      coEmissions:{ type: String,  required: false},
      energyEfficiencyClass:{ type: String,  required: false},
      
    },

    // Category: Euro Standard
    euroStandard: {
      fuelType:{type:String, required: false},
      transmission:{type:String, required: false},
    },

    location: {
      address: { type: String, required: false },
      city: { type: String, required: false },
      country: { type: String, required: false },
      coordinates: {
        lat: { type: Number, required: false },
        lng: { type: Number, required: false },
      },
    },

    // Relationships and other top-level fields
    user: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: false },


    status: {
      type: String,
      enum: Object.values(carStatus),
      default: carStatus.ACTIVE,
    },
    description: {type:String, required:false},
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true,},

     },

  { timestamps: true },
)

const careCompareSchema = new Schema<ICareCompare, CareCompareModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    car: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  },{
    timestamps: true
  })

serviceSchema.pre('save', async function (this: HydratedDocument<IService>, next) {
  try {
    if (this.isNew) {
      this.totalMiles = this.miles ?? 0
      return next()
    }

    if (!this.isModified('miles')) return next()

    const prev = await (this.constructor as Model<IService>).findById(this._id).select('miles totalMiles').lean()
    const prevMiles = (prev?.miles ?? 0) as number
    const newMiles = Number(this.miles ?? 0)
    const delta = newMiles - prevMiles

    if (delta !== 0) {
      this.totalMiles = (this.totalMiles ?? 0) + delta
    }

    return next()
  } catch (err) {
    return next(err as any)
  }
})


serviceSchema.pre('findOneAndUpdate', async function (this: any, next: (err?: any) => void) {
  try {
    const update = this.getUpdate() as any
    if (!update) return next()

    const set = update.$set ?? update
    if (set.miles === undefined) return next()

    const newMiles = Number(set.miles ?? 0)

    const query = this.getQuery()
    const prevDoc = await this.model.findOne(query).select('miles').lean()
    const prevMiles = (prevDoc?.miles ?? 0) as number

    const delta = newMiles - prevMiles
    if (!update.$inc) update.$inc = {}
    update.$inc.totalMiles = (update.$inc.totalMiles ?? 0) + delta

    this.setUpdate(update)
    return next()
  } catch (err) {
    return next(err)
  }
})

export const ServiceModelInstance = model<IService, ServiceModel>('Service', serviceSchema)


export const CareCompareModelInstance = model<ICareCompare, CareCompareModel>('CareCompare', careCompareSchema);