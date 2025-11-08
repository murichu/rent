import dotenv from 'dotenv';
import { z } from 'zod';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url('Invalid DATABASE_URL'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters').optional(),

    // Server
    PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('4000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // CORS
    ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),

    // Redis
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default('6379'),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.string().transform(Number).pipe(z.number().int().min(0).max(15)).default('0'),

    // Email
    EMAIL_USER: z.string().email().optional(),
    EMAIL_PASSWORD: z.string().optional(),

    // M-Pesa
    MPESA_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
    MPESA_CONSUMER_KEY: z.string().optional(),
    MPESA_CONSUMER_SECRET: z.string().optional(),
    MPESA_SHORTCODE: z.string().optional(),
    MPESA_PASSKEY: z.string().optional(),
    MPESA_CALLBACK_URL: z.string().url().optional(),
    MPESA_INITIATOR_NAME: z.string().optional(),
    MPESA_SECURITY_CREDENTIAL: z.string().optional(),

    // KCB
    KCB_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
    KCB_CLIENT_ID: z.string().optional(),
    KCB_CLIENT_SECRET: z.string().optional(),
    KCB_API_KEY: z.string().optional(),
    KCB_ACCOUNT_NUMBER: z.string().optional(),
    KCB_PASSKEY: z.string().optional(),

    // Africa's Talking
    AFRICASTALKING_API_KEY: z.string().optional(),
    AFRICASTALKING_USERNAME: z.string().default('sandbox'),
    AFRICASTALKING_SENDER_ID: z.string().default('Haven'),

    // Pesapal
    PESAPAL_CONSUMER_KEY: z.string().optional(),
    PESAPAL_CONSUMER_SECRET: z.string().optional(),
    PESAPAL_IPN_ID: z.string().optional(),
    PESAPAL_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

    // Features
    ENABLE_CRON_JOBS: z.string().transform(val => val !== 'false').default('true'),
    ENABLE_MEMORY_MONITORING: z.string().transform(val => val !== 'false').default('true'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_QUERIES: z.string().transform(val => val === 'true').default('false'),

    // Load Balancer
    INSTANCE_ID: z.string().optional(),
    SHUTDOWN_TIMEOUT: z.string().transform(Number).pipe(z.number().int().min(1000)).default('30000'),
    TRUST_PROXY: z.string().transform(val => val === 'true').default('false'),
    SESSION_TTL: z.string().transform(Number).pipe(z.number().int().min(300)).default('86400'),
    SESSION_COOKIE_NAME: z.string().default('haven_session'),
});

// Validate environment variables
let config;
try {
    config = envSchema.parse(process.env);
    logger.info('Environment configuration validated successfully');
} catch (error) {
    logger.warn('Environment validation failed, using defaults:', {
        errors: error.errors?.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            received: err.received
        }))
    });
    // Use safeParse to get partial config with defaults
    const result = envSchema.safeParse(process.env);
    config = result.success ? result.data : {
        DATABASE_URL: process.env.DATABASE_URL || 'mongodb://localhost:27017/haven_dev',
        JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-change-in-production-min-32-chars',
        REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-key-change-in-production-min-32',
        PORT: parseInt(process.env.PORT) || 4000,
        NODE_ENV: process.env.NODE_ENV || 'development',
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:5173',
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
        REDIS_DB: parseInt(process.env.REDIS_DB) || 0,
        MPESA_ENVIRONMENT: process.env.MPESA_ENVIRONMENT || 'sandbox',
        AFRICASTALKING_USERNAME: process.env.AFRICASTALKING_USERNAME || 'sandbox',
        AFRICASTALKING_SENDER_ID: process.env.AFRICASTALKING_SENDER_ID || 'Haven',
        PESAPAL_ENVIRONMENT: process.env.PESAPAL_ENVIRONMENT || 'sandbox',
        KCB_ENVIRONMENT: process.env.KCB_ENVIRONMENT || 'sandbox',
        ENABLE_CRON_JOBS: process.env.ENABLE_CRON_JOBS !== 'false',
        ENABLE_MEMORY_MONITORING: process.env.ENABLE_MEMORY_MONITORING !== 'false',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        LOG_QUERIES: process.env.LOG_QUERIES === 'true',
        SHUTDOWN_TIMEOUT: parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000,
        TRUST_PROXY: process.env.TRUST_PROXY === 'true',
        SESSION_TTL: parseInt(process.env.SESSION_TTL) || 86400,
        SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'haven_session',
    };
    logger.info('Continuing with default configuration for development');
}

// Security checks for production
if (config.NODE_ENV === 'production') {
    const productionChecks = [
        {
            check: config.JWT_SECRET !== 'dev-secret' && config.JWT_SECRET !== 'your-super-secret-jwt-key-change-in-production',
            message: 'JWT_SECRET must be changed from default value in production'
        },
        {
            check: config.DATABASE_URL.includes('mongodb://') && !config.DATABASE_URL.includes('localhost'),
            message: 'DATABASE_URL should not use localhost in production'
        },
        {
            check: config.REDIS_PASSWORD && config.REDIS_PASSWORD.length > 0,
            message: 'REDIS_PASSWORD should be set in production'
        },
        {
            check: config.ALLOWED_ORIGINS !== 'http://localhost:5173',
            message: 'ALLOWED_ORIGINS should be configured for production domains'
        }
    ];

    const failedChecks = productionChecks.filter(check => !check.check);
    if (failedChecks.length > 0) {
        logger.error('Production security checks failed:', {
            failures: failedChecks.map(check => check.message)
        });
        process.exit(1);
    }
}

// Derived configurations
const derivedConfig = {
    ...config,

    // Database
    isDatabaseMongoDB: config.DATABASE_URL.includes('mongodb'),

    // Redis
    redisConfig: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD || undefined,
        db: config.REDIS_DB,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        family: 4,
        enableOfflineQueue: false,
    },

    // CORS
    corsOrigins: config.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),

    // Security
    isProduction: config.NODE_ENV === 'production',
    isDevelopment: config.NODE_ENV === 'development',
    isTest: config.NODE_ENV === 'test',

    // Features - TEMPORARILY DISABLED FOR DEBUGGING
    features: {
        cronJobs: false, // config.ENABLE_CRON_JOBS,
        memoryMonitoring: false, // config.ENABLE_MEMORY_MONITORING,
        queryLogging: config.LOG_QUERIES,
    },

    // Payment providers status
    paymentProviders: {
        mpesa: !!(config.MPESA_CONSUMER_KEY && config.MPESA_CONSUMER_SECRET),
        kcb: !!(config.KCB_CLIENT_ID && config.KCB_CLIENT_SECRET),
        pesapal: !!(config.PESAPAL_CONSUMER_KEY && config.PESAPAL_CONSUMER_SECRET),
    },

    // Communication providers status
    communicationProviders: {
        email: !!(config.EMAIL_USER && config.EMAIL_PASSWORD),
        sms: !!config.AFRICASTALKING_API_KEY,
        whatsapp: !!config.AFRICASTALKING_API_KEY,
    }
};

export default derivedConfig;