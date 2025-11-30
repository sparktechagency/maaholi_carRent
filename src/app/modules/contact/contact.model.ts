import { model, Schema } from "mongoose";
import { ContactModel, IContact } from "./contact.inerface";

const contactSchema = new Schema<IContact,ContactModel>({
    full_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    contact_number: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, {
    timestamps: true
})


export const Contact =  model<IContact,ContactModel>("Contact", contactSchema);