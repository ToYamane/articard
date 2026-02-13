import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: 'connected' | 'disconnected';
  };
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version || '0.1.0';

  let databaseStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    // データベース接続確認
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = 'connected';
  } catch (error) {
    logger.error('Health check - Database error', { error });
  }

  const isHealthy = databaseStatus === 'connected';

  const healthStatus: HealthStatus = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    version,
    checks: {
      database: databaseStatus,
    },
  };

  return NextResponse.json(healthStatus, {
    status: isHealthy ? 200 : 503,
  });
}
