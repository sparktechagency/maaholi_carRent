import QueryBuilder from "../../../shared/apiFeature";
import { IContact } from "./contact.inerface";
import { Contact } from "./contact.model";
import { query } from 'express';

const createContact = async (payload: IContact): Promise<IContact> => {
    const result = await Contact.create(payload);
    return result;
}

const getAllContacts = async (query: Record<string, any>)=> {
    const contactQuery = new QueryBuilder(Contact.find(), query).paginate();

    const [contacts,pagination] = await Promise.all([
        contactQuery.queryModel.lean(),
        contactQuery.getPaginationInfo()
    ]);


    return {
        data: contacts,
        pagination
    }

}


const deleteContact = async (id: string): Promise<IContact | null> => {
    const result = await Contact.findByIdAndDelete(id);
    return result;
}

export const ContactService = {
    createContact,
    getAllContacts,
    deleteContact
}