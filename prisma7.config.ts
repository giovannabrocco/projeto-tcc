import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import process from 'process';

export default defineConfig({
  schema: './prisma/schema.prisma',

  datasource: {
    url: process.env.DATABASE_URL,
  },
});
