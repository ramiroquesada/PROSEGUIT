import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://proseguit:proseguit@localhost:5433/proseguit',
  },
});
