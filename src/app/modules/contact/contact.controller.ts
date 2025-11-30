import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ContactService } from "./contact.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";

const createContact = catchAsync(async(req: Request, res: Response)=>{
    const payload = req.body;
    const result = await ContactService.createContact(payload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Message Sent Successfully",
        data: result
    })
})


const getAllContacts = catchAsync(async(req: Request, res: Response)=>{
    const result = await ContactService.getAllContacts(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Contacts Retrieved Successfully",
        data: result.data,
        pagination: result.pagination as any
    })
});

const deleteContact = catchAsync(async(req: Request, res: Response)=>{
    const result = await ContactService.deleteContact(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Contact Deleted Successfully",
        data: result
    })
});

export const ContactController = {
    createContact,
    getAllContacts,
    deleteContact
}