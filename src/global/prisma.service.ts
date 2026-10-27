import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const rawUrl = process.env.DATABASE_URL;
    const url = rawUrl ? new URL(rawUrl) : null;

    super({
      adapter: new PrismaPg({
        host: url?.hostname,
        port: Number(url?.port || 5432),
        database: url?.pathname.replace('/', ''),
        user: url?.username,
        password: url?.password,
      }),
    });
  }
}

// || - ou
