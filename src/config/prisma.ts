import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// 1. Initialize the native database driver client
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// 2. Wrap it with the Prisma Driver Adapter
const adapter = new PrismaPg(pool);

// 3. Instantiate the Prisma Client with the adapter
export const prisma = new PrismaClient({ adapter });