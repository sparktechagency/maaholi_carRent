// helpers/corsHelper.ts
import { Request, Response } from 'express';

const ALLOWED_ORIGINS = [
    "http://10.10.7.47:3000",
    "http://10.10.7.72:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

export const setCorsHeaders = (req: Request, res: Response): void => {
    const origin = req.headers.origin;
    
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'false');
    }
};