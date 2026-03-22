import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';

const adapter = new PrismaPg({ connectionString: env.database.url });

export const prisma = new PrismaClient({ adapter });
