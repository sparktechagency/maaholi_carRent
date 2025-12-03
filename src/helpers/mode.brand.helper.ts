import { CarModel } from "../app/modules/Model/models.model";
import { BrandModel } from "../app/modules/subCategory-Brand-Model/subCategory.model";

const getBrandAndModelIds = async (brandName: string, modelName: string) => {
  if (!brandName || !modelName) return { brandId: null, modelId: null };

  const brandNameNormalized = brandName.trim().toLowerCase();
  const modelNameNormalized = modelName.trim();

  const brand = await BrandModel.findOne({ brand: brandNameNormalized });
  if (!brand) {
    throw new Error(`Brand not found: ${brandName}`);
  }

  const model = await CarModel.findOne({
    brand: brand._id,
    model: modelNameNormalized
  });

  if (!model) {
    throw new Error(`Model not found for brand "${brandName}": ${modelName}`);
  }

  return { brandId: brand._id, modelId: model._id };
};
export default getBrandAndModelIds;