import './env.js';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
    errorFormat: 'minimal',
  });

  client.$on('error', (e) => logger.error('Prisma DB error', { message: e.message }));
  client.$on('warn', (e) => logger.warn('Prisma DB warning', { message: e.message }));

  return client;
}

if (!global.__prisma) {
  global.__prisma = createPrismaClient();
}

export const prisma = global.__prisma;

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', { message: error.message });
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
