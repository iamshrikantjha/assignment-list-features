/**
 * @file env.ts
 * @description Centralised environment variable parsing and validation leveraging Zod.
 * These comments exist to keep the code approachable for future teammates.
 */

import { config as loadEnvFromFile } from 'dotenv';
import { z } from 'zod';

import { logger } from '../utils/logger';

// Load variables from a `.env` file during local development before validation occurs.
loadEnvFromFile();

/**
 * The schema expresses the contract for all required runtime configuration.
 * We use strong validation to detect misconfiguration early during boot.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 8080))
    .refine((value) => Number.isInteger(value) && value > 0, 'PORT must be a positive integer'),
  MONGODB_URI: z
    .string()
    .optional()
    .transform((value) => value ?? 'mongodb://localhost:27017/my_list_service'),
  REQUEST_LOG_LEVEL: z.enum(['silent', 'info', 'debug']).default('info'),
  CACHE_TTL_SECONDS: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 30))
    .refine((value) => Number.isFinite(value) && value >= 0, 'CACHE_TTL_SECONDS must be >= 0'),
  CACHE_MAX_ITEMS: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 10_000))
    .refine((value) => Number.isFinite(value) && value > 0, 'CACHE_MAX_ITEMS must be > 0')
});

/**
 * Parse and export the validated configuration.
 * In case of validation errors, we surface them immediately and terminate the process.
 */
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // We log the structured error for easier troubleshooting.
  logger.error({
    msg: 'Environment variable validation failed',
    issues: parsedEnv.error.flatten()
  });
  // Throwing during module evaluation prevents the service from starting with invalid configuration.
  throw new Error('Invalid environment configuration.');
}

/**
 * Fully validated and type-safe configuration object for downstream modules.
 */
export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  mongoUri: parsedEnv.data.MONGODB_URI,
  requestLogLevel: parsedEnv.data.REQUEST_LOG_LEVEL,
  cacheTtlSeconds: parsedEnv.data.CACHE_TTL_SECONDS,
  cacheMaxItems: parsedEnv.data.CACHE_MAX_ITEMS
} as const;

