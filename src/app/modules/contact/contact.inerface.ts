import { Model } from "mongoose";

export type IContact = {
    full_name: String;
    email : String;
    contact_number: String;
    message: String;
}


export type ContactModel = Model<IContact, Record<string, unknown>>;