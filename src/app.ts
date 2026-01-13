import express, { Request, Response } from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import { Morgan } from "./shared/morgan";
import router from '../src/app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import handleStripeWebhook from "./webhook/handleStripeWebhook";
import { logger } from "./shared/logger";
const app = express();

//body parser
// cors({ origin: "*"})
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://83.228.197.97:3000",
        "http://83.228.197.97:5001",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://31.97.114.108:5173",
        "http://31.97.114.108:3000",
        "http://10.10.7.47:3003",
        "http://31.97.114.108:4174",
      ];
      
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`Blocked by CORS: ${origin}`);
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
// morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// stripe webhook 
app.use(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    handleStripeWebhook
);



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//file retrieve
app.use(express.static('uploads'));

//router
app.use('/api/v1', router);

app.get("/", (req: Request, res: Response)=>{
    res.send("Hey Welcome to the API World. How can I assist you");
})

//global error handle
app.use(globalErrorHandler);

// handle not found route
app.use((req: Request, res: Response)=>{
    res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Not Found",
        errorMessages: [
            {
                path: req.originalUrl,
                message: "API DOESN'T EXIST"
            }
        ]
    })
});

export default app;