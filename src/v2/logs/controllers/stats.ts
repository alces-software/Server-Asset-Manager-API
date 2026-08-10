import { Hono } from 'hono';

import { forbiddenError, internalServerError } from '../../../lib/errorMessages';
import { prisma } from '../../../lib/prisma';
import { validatePermissions } from '../../../lib/util';

export default new Hono().get('/', async (c) => {
   try {
      // Check user permissions
      if (!validatePermissions(['log.read'], c)) {
         return forbiddenError(c);
      }
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [totalRequests, recentRequests, errors, averageDuration, endpointStats] =
         await Promise.all([
            prisma.log.count(),

            prisma.log.count({
               where: {
                  timestamp: {
                     gte: since
                  }
               }
            }),

            prisma.log.count({
               where: {
                  timestamp: {
                     gte: since
                  },
                  code: {
                     startsWith: '5'
                  }
               }
            }),

            prisma.log.aggregate({
               where: {
                  timestamp: {
                     gte: since
                  }
               },
               _avg: {
                  durationMs: true
               }
            }),

            prisma.log.groupBy({
               by: ['endpoint'],
               where: {
                  timestamp: {
                     gte: since
                  }
               },
               _count: {
                  endpoint: true
               },
               _avg: {
                  durationMs: true
               },
               orderBy: {
                  _count: {
                     endpoint: 'desc'
                  }
               }
            })
         ]);

      return c.json({
         totalRequests,
         last24Hours: {
            requests: recentRequests,
            errors,
            errorRate:
               recentRequests > 0 ? Number(((errors / recentRequests) * 100).toFixed(2)) : 0,
            averageDurationMs: Math.round(averageDuration._avg.durationMs ?? 0)
         },
         endpoints: endpointStats.map((endpoint) => ({
            endpoint: endpoint.endpoint,
            requests: endpoint._count.endpoint,
            averageDurationMs: Math.round(endpoint._avg.durationMs ?? 0)
         }))
      });
   } catch (err) {
      return internalServerError(c, err);
   }
});
