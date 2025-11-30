import mongoose from "mongoose";
import { BlogModel, IBlog } from "./blog.interface";

const blogSchema = new mongoose.Schema<IBlog>(
    {
        title: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        image: {
            type: String,
            required: true
        },
        tags: [
            {
                type: String,
                required: true
            }
        ]
    },
    {
        timestamps: true
    }
);

export const Blog = mongoose.model<IBlog, BlogModel>("Blog", blogSchema);