import { z } from 'zod'
import { objectIdZodSchema } from '../../../helpers/checkObjectIdZodSchemaHelper'

const createSubCategoryZodSchema = z.object({
    body: z.object({
        category : objectIdZodSchema("Category Id"),
        brand: z.string({ required_error: 'Brand name is required' })
    })
})

export const SubCategoryValidation = {
    createSubCategoryZodSchema
}
