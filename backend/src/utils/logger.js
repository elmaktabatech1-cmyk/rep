import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const maskPII = winston.format((info) => {
  const mask = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***')
      .replace(/(\+?\d[\d\s\-().]{7,}\d)/g, '***PHONE***')
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***JWT***')
      .replace(/"password[^"]*"\s*:\s*"[^"]+"/gi, '"password":"***"')
      .replace(/"(access|refresh)?[Tt]oken"\s*:\s*"[^"]+"/g, '"token":"***"');
  };
  if (typeof info.message === 'string') info.message = mask(info.message);
  return info;
});

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const m = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${m}`;
  })
);

const fileFormat = winston.format.combine(
  maskPII(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: false }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? winston.format.combine(maskPII(), consoleFormat) : consoleFormat,
  }),
];

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error', format: fileFormat, maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log'), format: fileFormat, maxsize: 10 * 1024 * 1024, maxFiles: 10 })
  );
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports,
  exceptionHandlers: [new winston.transports.Console({ format: consoleFormat })],
  rejectionHandlers: [new winston.transports.Console({ format: consoleFormat })],
  exitOnError: false,
});
