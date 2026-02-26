import { z } from "zod";

const createBlogZodSchema = z.object({
    body: z.object({
        title: z.string({
            required_error: "Title is required"
        }),
        type: z.string({
            required_error: "Type is required"
        }),
        description: z.string({
            required_error: "Description is required"
        }),
        image: z.any({
            required_error: "Image is required"
        }),
        tags: z.array(z.string(), {
            required_error: "Tags are required"
        })
    })
});

export const BlogValidation = {
    createBlogZodSchema
};