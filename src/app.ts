import express, { Request, Response } from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import { Morgan } from "./shared/morgan";
import router from '../src/app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import handleStripeWebhook from "./webhook/handleStripeWebhook";
import { logger } from "./shared/logger";

const app = express();

// Define allowed origins
const allowedOrigins = [
  "http://83.228.197.97:3000",
  "http://10.10.7.47:3000",
  "http://83.228.197.97:5001",
  "http://10.10.7.47:3003",
  "https://admin.carplace24.ch",
  "http://127.0.0.1:3000",
  "https://carplace24.ch",
  "http://31.97.114.108:4174",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  // Add more if needed
];

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log the blocked origin for debugging
        logger.warn(`❌ Blocked by CORS: ${origin}`);
        console.log(`❌ Blocked origin: ${origin}`);
        console.log(`✅ Allowed origins:`, allowedOrigins);
        
        // For development, you might want to allow it anyway
        // Comment this line in production:
        callback(null, true); // ← Temporarily allow all origins for testing
        
        // Uncomment this in production:
        // callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Morgan logging
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// Stripe webhook - MUST be before express.json()
app.use(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('uploads'));

// Routes
app.use('/api/v1', router);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "BookRite API is running",
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(globalErrorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "Not Found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST"
      }
    ]
  });
});

export default app;