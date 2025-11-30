import { z } from "zod";

const createBookmarkZodSchema = z.object({
    body: z.object({
        car: z.string({
            required_error: "Car ID is required"
        })
    })
});

export const BookmarkValidation = {
    createBookmarkZodSchema
};