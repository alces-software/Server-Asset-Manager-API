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

      const [
         totalRequests,
         recentRequests,
         errors,
         averageDuration,
         endpointStats,
         statusCodeStats,
         methodStats,
         slowRequests,
         verySlowRequests,
         requestsOverTime
      ] = await Promise.all([
         // Total requests
         prisma.log.count(),

         // Requests in the last 24 hours
         prisma.log.count({
            where: {
               timestamp: {
                  gte: since
               }
            }
         }),

         // 5xx errors in the last 24 hours
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

         // Average duration in the last 24 hours
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

         // Requests grouped by endpoint
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
         }),

         // Requests grouped by status code
         prisma.log.groupBy({
            by: ['code'],
            where: {
               timestamp: {
                  gte: since
               }
            },
            _count: {
               code: true
            }
         }),

         // Requests grouped by HTTP method
         prisma.log.groupBy({
            by: ['method'],
            where: {
               timestamp: {
                  gte: since
               }
            },
            _count: {
               method: true
            }
         }),

         // Requests slower than 500ms
         prisma.log.count({
            where: {
               timestamp: {
                  gte: since
               },
               durationMs: {
                  gt: 500
               }
            }
         }),

         // Requests slower than 1 second
         prisma.log.count({
            where: {
               timestamp: {
                  gte: since
               },
               durationMs: {
                  gt: 1000
               }
            }
         }),

         // Requests grouped by hour
         prisma.log.groupBy({
            by: ['hourBucket'],
            where: {
               timestamp: {
                  gte: since
               }
            },
            _count: {
               hourBucket: true
            },
            orderBy: {
               hourBucket: 'asc'
            }
         })
      ]);

      const statusCodes = {
         '2xx': 0,
         '3xx': 0,
         '4xx': 0,
         '5xx': 0
      };

      for (const status of statusCodeStats) {
         const code = Number(status.code);
         const count = status._count.code;

         if (code >= 200 && code < 300) {
            statusCodes['2xx'] += count;
         } else if (code >= 300 && code < 400) {
            statusCodes['3xx'] += count;
         } else if (code >= 400 && code < 500) {
            statusCodes['4xx'] += count;
         } else if (code >= 500 && code < 600) {
            statusCodes['5xx'] += count;
         }
      }

      const methods = Object.fromEntries(
         methodStats.map((method) => [method.method, method._count.method])
      );

      return c.json({
         totalRequests,

         last24Hours: {
            requests: recentRequests,
            errors,
            errorRate:
               recentRequests > 0 ? Number(((errors / recentRequests) * 100).toFixed(2)) : 0,
            averageDurationMs: Math.round(averageDuration._avg.durationMs ?? 0)
         },

         statusCodes,

         methods,

         endpoints: endpointStats.map((endpoint) => ({
            endpoint: endpoint.endpoint,
            requests: endpoint._count.endpoint,
            averageDurationMs: Math.round(endpoint._avg.durationMs ?? 0)
         })),

         slowRequests,

         verySlowRequests,

         requestsOverTime: requestsOverTime.map((bucket) => ({
            timestamp: bucket.timestamp,
            requests: Number(bucket.requests)
         }))
      });
   } catch (err) {
      return internalServerError(c, err);
   }
});
