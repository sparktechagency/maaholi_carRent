import { z } from 'zod'
import { objectIdZodSchema } from '../../../helpers/checkObjectIdZodSchemaHelper'
import { model } from 'mongoose'

const createSubCategoryZodSchema = z.object({
    body: z.object({
        brand : objectIdZodSchema("brand Id"),
        model: z.string({ required_error: 'model is required' })
    })
})

export const SubCategoryValidation = {
    createSubCategoryZodSchema
}
