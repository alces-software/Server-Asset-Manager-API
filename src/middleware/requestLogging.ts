import { Context, Next } from 'hono';
import { prisma } from '../lib/prisma';

/**
 * Logs the requests that are sent to the api
 * @param c
 * @param next
 * @returns
 */
async function logRequests(c: Context, next: Next) {
   if (!c.req.path.startsWith('/api/')) {
      return next();
   }

   const start = Date.now();
   const requestSizeBytes = Number(c.req.header('content-length')) || null;

   await next();

   const durationMs = Date.now() - start;
   const user = c.get('user');
   const responseSizeBytes = Number(c.res.headers.get('content-length')) || null;

   try {
      const timestamp = new Date();

      const hourBucket = new Date(timestamp);
      hourBucket.setMinutes(0, 0, 0);

      await prisma.log.create({
         data: {
            user: user?.id
               ? {
                    connect: {
                       id: user.id
                    }
                 }
               : undefined,
            endpoint: c.req.path,
            method: c.req.method,
            durationMs,
            code: String(c.res.status),
            requestSizeBytes,
            responseSizeBytes,
            hourBucket
         }
      });
   } catch (error) {
      console.error('Failed to save request log:', error);
   }

   const time = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
   });

   console.log(
      `${time} - ${user?.username ?? 'Guest'}: ` +
         `${c.req.method} ${c.req.path} ${c.res.status} - ${durationMs}ms`
   );
}

export { logRequests };
