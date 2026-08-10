import { Hono } from 'hono';
import { z } from 'zod';

const logsQuery = {
   userId: z.coerce
      .number({ error: 'User ID must be a number' })
      .int({ error: 'User ID must be an integer' })
      .positive({ error: 'User ID must be greater than 0' })
      .optional(),

   endpoint: z.string().optional(),

   method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']).optional(),

   code: z.coerce
      .number({ error: 'Status code must be a number' })
      .int({ error: 'Status code must be an integer' })
      .min(100, { error: 'Status code must be at least 100' })
      .max(599, { error: 'Status code must be at most 599' })
      .optional(),

   from: z.coerce.date({ error: 'From must be a valid date' }).optional(),

   to: z.coerce.date({ error: 'To must be a valid date' }).optional(),

   minDurationMs: z.coerce
      .number({ error: 'Minimum duration must be a number' })
      .int({ error: 'Minimum duration must be an integer' })
      .nonnegative({ error: 'Minimum duration cannot be negative' })
      .optional(),

   maxDurationMs: z.coerce
      .number({ error: 'Maximum duration must be a number' })
      .int({ error: 'Maximum duration must be an integer' })
      .nonnegative({ error: 'Maximum duration cannot be negative' })
      .optional()
};

import { prisma } from '../../../lib/prisma';
import { internalServerError } from '../../../lib/errorMessages';
import { paginationQueryValidator } from '../../../lib/validators';

export default new Hono().get('/', paginationQueryValidator(logsQuery), async (c) => {
   try {
      const {
         page,
         limit,
         userId,
         endpoint,
         method,
         code,
         from,
         to,
         minDurationMs,
         maxDurationMs
      } = c.req.valid('query');

      const where = {
         ...(userId !== undefined && {
            userId
         }),

         ...(endpoint !== undefined && {
            endpoint: {
               contains: endpoint
            }
         }),

         ...(method !== undefined && {
            method
         }),

         ...(code !== undefined && {
            code: String(code)
         }),

         ...((from !== undefined || to !== undefined) && {
            timestamp: {
               ...(from !== undefined && {
                  gte: from
               }),
               ...(to !== undefined && {
                  lte: to
               })
            }
         }),

         ...((minDurationMs !== undefined || maxDurationMs !== undefined) && {
            durationMs: {
               ...(minDurationMs !== undefined && {
                  gte: minDurationMs
               }),
               ...(maxDurationMs !== undefined && {
                  lte: maxDurationMs
               })
            }
         })
      };

      console.log('Query params:', {
         userId,
         endpoint,
         method,
         code,
         from,
         to,
         minDurationMs,
         maxDurationMs
      });

      console.log('Where:', where);

      const [logs, total] = await prisma.$transaction([
         prisma.log.findMany({
            where,
            include: {
               user: true
            },
            orderBy: {
               timestamp: 'desc'
            },
            skip: (page - 1) * limit,
            take: limit
         }),

         prisma.log.count({ where })
      ]);

      return c.json({
         logs: logs.map((log) => ({
            id: log.id,
            userId: log.userId,
            timestamp: log.timestamp,
            endpoint: log.endpoint,
            method: log.method,
            durationMs: log.durationMs,
            code: log.code,
            requestSizeBytes: log.requestSizeBytes,
            responseSizeBytes: log.responseSizeBytes
         })),
         page,
         limit,
         total,
         totalPages: Math.ceil(total / limit)
      });
   } catch (err) {
      return internalServerError(c, err);
   }
});
