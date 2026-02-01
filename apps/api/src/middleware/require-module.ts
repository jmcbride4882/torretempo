import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export function requireModule(moduleKey: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.tenantId) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      // Check if module is enabled for tenant
      const tenantModule = await prisma.tenantModule.findUnique({
        where: {
          tenantId_moduleKey: {
            tenantId: req.tenantId,
            moduleKey,
          },
        },
      });

      if (!tenantModule || !tenantModule.enabled) {
        res.status(403).json({
          error: 'Module not enabled',
          message: `The '${moduleKey}' module is not enabled for this tenant`,
          upgrade_url: `/t/${req.tenant?.slug}/billing/upgrade?module=${moduleKey}`,
        });
        return;
      }

      // Check if trial expired
      if (
        tenantModule.trialUntil &&
        new Date() > tenantModule.trialUntil
      ) {
        res.status(403).json({
          error: 'Module trial expired',
          message: `The trial for '${moduleKey}' has expired`,
          upgrade_url: `/t/${req.tenant?.slug}/billing/upgrade?module=${moduleKey}`,
        });
        return;
      }

      logger.debug(
        { tenantId: req.tenantId, moduleKey },
        'Module access granted'
      );

      next();
    } catch (error) {
      logger.error({ error, moduleKey }, 'Module check failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
