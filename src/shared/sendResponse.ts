import { Response } from 'express';
import { any } from 'zod';

type IData<T> = {
    success: boolean;
    statusCode: number;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        totalPage: number;
        total: number;
        meta: any;
    
    };
    data?: T;
};

const sendResponse = <T>(res: Response, data: IData<T>) => {
    const resData = {
        success: data.success,
        message: data.message,
        pagination: data.pagination,
        data: data.data,
        meta: data.pagination,
    };
    res.status(data.statusCode).json(resData);
};

export default sendResponse;
