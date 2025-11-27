import { Request } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import ApiError from '../../errors/ApiError';

const fileUploadHandler = () => {

    // Base upload folder
    const baseUploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(baseUploadDir)) {
        fs.mkdirSync(baseUploadDir);
    }

    // Folder generator
    const createDir = (dirPath: string) => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    };

    // Multer storage
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            let uploadDir;

            switch (file.fieldname) {

                case 'image':
                    uploadDir = path.join(baseUploadDir, 'images');
                    break;

                case 'logo':
                    uploadDir = path.join(baseUploadDir, 'logo');
                    break;

                case 'tradeLicences':
                case 'basicInformation[tradeLicences]':
                    uploadDir = path.join(baseUploadDir, 'tradeLicences');
                    break;

                case 'proofOwnerId':
                case 'basicInformation[proofOwnerId]':
                    uploadDir = path.join(baseUploadDir, 'proofOwnerId');
                    break;

                case 'productImage':
                case 'basicInformation[productImage]':
                    uploadDir = path.join(baseUploadDir, 'productImage');
                    break;

                case 'insuranceProof':
                case 'basicInformation[insuranceProof]':
                    uploadDir = path.join(baseUploadDir, 'insuranceProof');
                    break;

                default:
                    return cb(new ApiError(StatusCodes.BAD_REQUEST, 'File is not supported'), '');
            }

            createDir(uploadDir);
            cb(null, uploadDir);
        },

        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const base =
                file.originalname.replace(ext, '').toLowerCase().split(' ').join('-') +
                '-' +
                Date.now();
            cb(null, base + ext);
        },
    });

    // Supported file fields
    const allowedFields = [
        'image',
        'logo',
        'tradeLicences',
        'basicInformation[tradeLicences]',
        'proofOwnerId',
        'basicInformation[proofOwnerId]',
        'productImage',
        'basicInformation[productImage]',
        'insuranceProof',
        'basicInformation[insuranceProof]',
    ];

    // File filter
    const filterFilter = (req: Request, file: any, cb: FileFilterCallback) => {
        if (allowedFields.includes(file.fieldname)) {
            if (
                file.mimetype === 'image/jpeg' ||
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/jpg'
            ) {
                return cb(null, true);
            }
            return cb(
                new ApiError(StatusCodes.BAD_REQUEST, 'Only .jpeg, .png, .jpg files are allowed')
            );
        }

        return cb(new ApiError(StatusCodes.BAD_REQUEST, `Unexpected field: ${file.fieldname}`));
    };

    // Multer fields
    const upload = multer({
        storage: storage,
        fileFilter: filterFilter,
    }).fields([
        { name: 'image', maxCount: 30 },
        { name: 'logo', maxCount: 5 },

        { name: 'tradeLicences', maxCount: 15 },
        { name: 'basicInformation[tradeLicences]', maxCount: 15 },

        { name: 'proofOwnerId', maxCount: 15 },
        { name: 'basicInformation[proofOwnerId]', maxCount: 15 },

        { name: 'productImage', maxCount: 15 },
        { name: 'basicInformation[productImage]', maxCount: 10 },

        { name: 'insuranceProof', maxCount: 10 },
        { name: 'basicInformation[insuranceProof]', maxCount: 10 },
    ]);

    return upload;
};

// const fileUploadHandler = () => {

//     //create upload folder
//     const baseUploadDir = path.join(process.cwd(), 'uploads');
//     if (!fs.existsSync(baseUploadDir)) {
//         fs.mkdirSync(baseUploadDir);
//     }

//     //folder create for different file
//     const createDir = (dirPath: string) => {
//         if (!fs.existsSync(dirPath)) {
//         fs.mkdirSync(dirPath);
//         }
//     };

//     //create filename
//     const storage = multer.diskStorage({

//         destination: (req, file, cb) => {
//             let uploadDir;
//             switch (file.fieldname) {
//                 case 'image':
//                     uploadDir = path.join(baseUploadDir, 'images');
//                 break;
//                 case 'logo':
//                     uploadDir = path.join(baseUploadDir, 'logo');
//                 break;

//                 case 'tradeLicences':
//                 case 'basicInformation[tradeLicences]':
//                     uploadDir = path.join(baseUploadDir, 'tradeLicences');
//                 break;

//                 case 'proofOwnerId':
//                 case 'basicInformation[proofOwnerId]':
//                     uploadDir = path.join(baseUploadDir, 'proofOwnerId');
//                 break;
//                 // case 'productImage':
//                 //     uploadDir = path.join(baseUploadDir, 'productImage');
//                 // break;
//                 case 'productImage':
//                 case 'basicInformation[productImage]':
//                     uploadDir = path.join(baseUploadDir, 'productImage');
//                 break;
//                 case 'insuranceProof':
//                 case 'basicInformation[insuranceProof]': 
//                     uploadDir = path.join(baseUploadDir, 'insuranceProof'); 
//                 break;
//                 default:
//                     throw new ApiError(StatusCodes.BAD_REQUEST, 'File is not supported');
//             }
//             createDir(uploadDir);
//             cb(null, uploadDir);
//         },

//         filename: (req, file, cb) => {
//             const fileExt = path.extname(file.originalname);
//             const fileName =
//                 file.originalname
//                 .replace(fileExt, '')
//                 .toLowerCase()
//                 .split(' ')
//                 .join('-') +
//                 '-' +
//                 Date.now();
//             cb(null, fileName + fileExt);
//         },
//     });

//     //file filter
//     const filterFilter = (req: Request, file: any, cb: FileFilterCallback) => {

//         // console.log("file handler",file)
//         if (file.fieldname === 'image' || file.fieldname === 'tradeLicences' || file.fieldname === 'proofOwnerId' || file.fieldname === 'productImage' ||file.fieldname === 'basicInformation[productImage]' || file.fieldname === 'basicInformation[insuranceProof]') {
//             if (
//                 file.mimetype === 'image/jpeg' ||
//                 file.mimetype === 'image/png' ||
//                 file.mimetype === 'image/jpg'
//             ) {
//                 cb(null, true);
//             } else {
//                 cb(new ApiError(StatusCodes.BAD_REQUEST, 'Only .jpeg, .png, .jpg file supported'))
//             }
//         }else {
//             cb(new ApiError(StatusCodes.BAD_REQUEST, 'This file is not supported'))
//         }
//     };

//     const upload = multer({ storage: storage, fileFilter: filterFilter})
//     .fields([
//         { name: 'image', maxCount: 30 },
//         { name: 'tradeLicences', maxCount: 15 },
//         { name: 'proofOwnerId', maxCount: 15 },
//         { name: 'productImage', maxCount: 15 },
//         { name: 'basicInformation[productImage]', maxCount: 1 }, // Single image
//       { name: 'basicInformation[insuranceProof]', maxCount: 5 },

//      ]);
//     return upload;

// };

export default fileUploadHandler;