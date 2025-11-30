import { z } from "zod";

const createContactZodValidation = z.object({
    body: z.object({
        full_name: z.string({
            required_error: "Name is required"
        }),
        email: z.string({
            required_error: "Email is required"
        }).email("Invalid email address"),
        contact_number: z.string({
            required_error: "Contact Number is required"
        }),
        message: z.string({
            required_error: "Message is required"
        })
    })
});

export const ContactValidation = {
    createContactZodValidation
};