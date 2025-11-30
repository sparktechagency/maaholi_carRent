import { z } from 'zod';

const createArticleZodSchema = z.object({
  title: z.string({
    required_error: 'title is required',
    invalid_type_error: 'title should be type string',
  }),
  image: z.string({
    required_error: 'image is required',
    invalid_type_error: 'image should be type string',
  }),
  description: z.string({
    required_error: 'description is required',
    invalid_type_error: 'description should be type string',
  }),
});

const updateArticleZodSchema = z.object({
  title: z
    .string({ invalid_type_error: 'title should be type string' })
    .optional(),
  image: z
    .string({ invalid_type_error: 'image should be type string' })
    .optional(),
  description: z
    .string({ invalid_type_error: 'description should be type string' })
    .optional(),
});

export const ArticleValidation = {
  createArticleZodSchema,
  updateArticleZodSchema,
};
