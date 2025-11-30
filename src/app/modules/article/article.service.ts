import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Article } from './article.model';
import { IArticle } from './article.interface';
import { ArticleValidation } from './article.validation';
import unlinkFile from '../../../shared/unlinkFile';

const createArticle = async (payload: IArticle): Promise<IArticle> => {
  await ArticleValidation.createArticleZodSchema.parseAsync(payload);
  const result = await Article.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create article!');
  }
  return result;
};

const getAllArticles = async (
  queryFields: Record<string, any>
): Promise<IArticle[]> => {
  const { search, page, limit } = queryFields;
  const query = search
    ? {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { image: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      }
    : {};
  let queryBuilder = Article.find(query);

  // if (page && limit) {
  //   queryBuilder = queryBuilder.skip((page - 1) * limit).limit(limit);
  // } else {
  //   queryBuilder = queryBuilder.skip((1 - 1) * 10).limit(10);
  // }
  // delete queryFields.search;
  // delete queryFields.page;
  // delete queryFields.limit;
  // queryBuilder.find(queryFields);
  return await queryBuilder;
};

const getArticleById = async (id: string): Promise<IArticle | null> => {
  const result = await Article.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Article not found!');
  }
  return result;
};

const updateArticle = async (
  id: string,
  payload: IArticle
): Promise<IArticle | null> => {
  await ArticleValidation.updateArticleZodSchema.parseAsync(payload);
  const isExistArticle = await getArticleById(id);
  if (!isExistArticle) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Article not found!');
  }
  if (
    typeof isExistArticle.image === 'string' &&
    typeof payload.image === 'string'
  ) {
    await unlinkFile(isExistArticle.image);
  }
  const result = await Article.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update article!');
  }
  return result;
};

const deleteArticle = async (id: string): Promise<IArticle | null> => {
  const isExistArticle = await getArticleById(id);
  if (!isExistArticle) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Article not found!');
  }

  if (typeof isExistArticle.image === 'string') {
    await unlinkFile(isExistArticle.image);
  }

  const result = await Article.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete article!');
  }
  return result;
};

export const ArticleService = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
};
