import { PrismaClient } from '@prisma/client';

// Single Prisma Client instance - the ONLY persistence layer (Neon PostgreSQL).
export const prisma = new PrismaClient();