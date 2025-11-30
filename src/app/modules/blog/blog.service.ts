import ApiError from "../../../errors/ApiError";
import QueryBuilder from "../../../shared/apiFeature";
import unlinkFile from "../../../shared/unlinkFile";
import { IBlog } from "./blog.interface";
import { Blog } from "./blog.model";

const createBlogIntoDB = async (payload: IBlog): Promise<IBlog> => {
    const result = await Blog.create(payload);
    return result;
}

const getAllBlogsFromDB = async (query: Record<string, any>) => {
    const blogQuery = new QueryBuilder(Blog.find(), query).search(["title", 'type', 'description']).filter().paginate();

    const [blogs, pagination] = await Promise.all([
        blogQuery.queryModel.lean(),
        blogQuery.getPaginationInfo()
    ]);

    return {
        data: blogs,
        pagination
    }
}

const updateBlogInDB = async (id: string, payload: Partial<IBlog>): Promise<IBlog | null> => {
    const exist = await Blog.findById(id);
    if (!exist) {
        throw new ApiError(404, "Blog not found");
    }

    if(payload.image && exist.image && payload.image !== exist.image){
        unlinkFile(exist.image);
    }
    const result = await Blog.findByIdAndUpdate(id, payload, { new: true });
    return result;
}


const deleteBlogFromDB = async (id: string): Promise<IBlog | null> => {
    const exist = await Blog.findById(id);
    if (!exist) {
        throw new ApiError(404, "Blog not found");
    }

    if(exist.image){
        unlinkFile(exist.image);
    }

    const result = await Blog.findByIdAndDelete(id);
    return result;
}


const getBlogDetailsFromDB = async (id: string)=> {
    const exist = await Blog.findById(id);
    if (!exist) {
        throw new ApiError(404, "Blog not found");
    }
    
    const relatedBlogs = await Blog.find({ _id: { $ne: id }, $or:[
        { tags: { $in: exist.tags } },
        { type: exist.type }
    ]}).limit(5).lean();

    return {
        blogDetails: exist,
        relatedBlogs
    }
}

export const BlogService = {
    createBlogIntoDB,
    getAllBlogsFromDB,
    updateBlogInDB,
    deleteBlogFromDB,
    getBlogDetailsFromDB
}