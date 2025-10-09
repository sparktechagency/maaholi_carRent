import { HydratedDocument, Model, model, Schema, Types } from 'mongoose'
import { IService, ServiceModel } from './service.interface'
import { carStatus } from '../../../enums/car-status'

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    // Category: Basic Information
    basicInformation: {
      make: { type: String, required: false },
      model: { type: String, required: false },
      deviceId: { type: String, required: false },
      deviceName: { type: String, required: false },
      year: { type: Number, required: false }, // use Number for year
      image: { type: String, required: true },
      insuranceProof: { type: [String], required: false },
      color: { type: String, required: false },
      vin: { type: String, required: false },
      tagNumber: { type: String, required: false },
      insurancePolicyNumber: { type: String, required: false },
    },

    // Category: Technical Information
    technicalInformation: {
      engineType: { type: String, required: false },
      transmission: { type: String, required: false },
      // add other technical fields here...
    },

    // Category: Electric & Hybrid Specific
    electricHybrid: {
      batteryCapacityKWh: { type: Number, required: false },
      chargingTimeHours: { type: Number, required: false },
      rangeKm: { type: Number, required: false },
      // add other EV-specific fields...
    },

    // Category: Equipment
    equipment: {
      hasNavigation: { type: Boolean, default: false },
      hasCruiseControl: { type: Boolean, default: false },
      // add equipment flags...
    },

    // Category: Extras
    extras: {
      roofRack: { type: Boolean, default: false },
      towBar: { type: Boolean, default: false },
      // add extras...
    },

    // Category: Colour (kept separate in case you have multiple color fields)
    colour: {
      exterior: { type: String, required: false },
      interior: { type: String, required: false },
    },

    // Category: Seats & Doors
    seatsAndDoors: {
      seats: { type: Number, required: false },
      doors: { type: Number, required: false },
    },

    // Category: Energy & Environment
    energyAndEnvironment: {
      co2EmissionGPerKm: { type: Number, required: false },
      fuelType: { type: String, required: false },
      // etc.
    },

    // Category: Euro Standard
    euroStandard: {
      euroClass: { type: String, required: false },
    },

    // Category: Location
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

    assignedUsers: [{ type: Types.ObjectId, ref: 'User' }],

    status: {
      type: String,
      default: 'PENDING',
      enum: Object.values(carStatus),
    },

    miles: { type: Number, default: 0 },
    totalMiles: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

/**
 * When saving a doc directly (doc.save()):
 * - if new: ensure totalMiles equals initial miles
 * - if miles changed: compute delta from DB and increment totalMiles
 */
serviceSchema.pre('save', async function (this: HydratedDocument<IService>, next) {
  try {
    // If it's a new document, initialize totalMiles to miles (if present)
    if (this.isNew) {
      this.totalMiles = this.miles ?? 0
      return next()
    }

    // If miles didn't change, nothing to do
    if (!this.isModified('miles')) return next()

    // Fetch previous document to compute delta
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

/**
 * When updating with findOneAndUpdate / findByIdAndUpdate:
 * - if the update sets miles to an absolute number, compute delta vs DB and add to $inc.totalMiles
 * - keep the set.miles in place so the actual miles field is updated
 */
serviceSchema.pre('findOneAndUpdate', async function (this: any, next: (err?: any) => void) {
  try {
    const update = this.getUpdate() as any
    if (!update) return next()

    const set = update.$set ?? update
    if (set.miles === undefined) return next()

    const newMiles = Number(set.miles ?? 0)

    // load previous doc
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
