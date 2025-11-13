/** Pino-based logger with opinionated defaults suited for production workloads. */

import pino from 'pino';

/**
 * Determine whether pretty-printing should be enabled.
 * Pretty mode is desirable during local development but can be noisy in production.
 */
// Disable pretty printing in production and test environments, or when explicitly silenced.
const isPretty =
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test' &&
  process.env.REQUEST_LOG_LEVEL !== 'silent';

/**
 * Instantiate the Pino logger with environment-driven sensitivity.
 */
export const logger = pino({
  level: process.env.REQUEST_LOG_LEVEL ?? 'info',
  // Redact sensitive fields in structured payloads to avoid accidental leaks.
  redact: ['req.headers.authorization', 'req.body.password', 'password'],
  transport: isPretty
    ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});

