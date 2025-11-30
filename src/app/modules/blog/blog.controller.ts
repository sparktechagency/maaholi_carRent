import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { BlogService } from "./blog.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { getSingleFilePath } from "../../../shared/getFilePath";

const createBlog = catchAsync(async(req: Request, res: Response)=>{
    const image = getSingleFilePath(req.files, "image")
    req.body.image = image;
    console.log(req.body);
    
    const result = await BlogService.createBlogIntoDB(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Blog created Successfully",
        data: result
    })
})

const updateBlog = catchAsync(async(req: Request, res: Response)=>{
    const image = getSingleFilePath(req.files, "image")
    if(image){
        req.body.image = image;
    }
    const result = await BlogService.updateBlogInDB(req.params.id, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Blog updated Successfully",
        data: result
    })
})

const getAllBlogs = catchAsync(async(req: Request, res: Response)=>{
    const result = await BlogService.getAllBlogsFromDB(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Blogs Retrieved Successfully",
        data: result.data,
        pagination: result.pagination as any
    })
})

const getBlogDetails = catchAsync(async(req: Request, res: Response)=>{
    const result = await BlogService.getBlogDetailsFromDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Blog Details Retrieved Successfully",
        data: result
    })
})

const deleteBlog = catchAsync(async(req: Request, res: Response)=>{
    const result = await BlogService.deleteBlogFromDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Blog Deleted Successfully",
        data: result
    })
});

export const BlogController = {
    createBlog,
    updateBlog,
    getAllBlogs,
    getBlogDetails,
    deleteBlog
}