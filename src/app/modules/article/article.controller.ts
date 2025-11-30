import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { ArticleService } from './article.service';

const createArticle = catchAsync(async (req: Request, res: Response) => {
  if (req.files && 'image' in req.files && req.files.image[0]) {
    req.body.image = '/images/' + req.files.image[0].filename;
  }

  const result = await ArticleService.createArticle(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Article created successfully',
    data: result,
  });
});

const getAllArticles = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;

  const result = await ArticleService.getAllArticles(query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Articles fetched successfully',
    // pagination: {
    //   limit: Number(query.limit) || 10,
    //   page: Number(query.page) || 1,
    //   total: result.length,
    //   totalPage: Math.ceil(result.length / (Number(query.limit))),
    // },
    data: result,
  });
});

const getArticleById = catchAsync(async (req: Request, res: Response) => {
  const result = await ArticleService.getArticleById(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Article fetched successfully',
    data: result,
  });
});

const updateArticle = catchAsync(async (req: Request, res: Response) => {
  if (req.files && 'image' in req.files && req.files.image[0]) {
    req.body.image = '/images/' + req.files.image[0].filename;
  }

  const result = await ArticleService.updateArticle(req.params.id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Article updated successfully',
    data: result,
  });
});

const deleteArticle = catchAsync(async (req: Request, res: Response) => {
  const result = await ArticleService.deleteArticle(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Article deleted successfully',
    data: result,
  });
});

export const ArticleController = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
};
