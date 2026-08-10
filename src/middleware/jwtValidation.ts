import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import { notFoundError, unauthorisedError } from '../lib/errorMessages';
import { prisma } from '../lib/prisma';

// The public routes that don't need validation
const publicRoutes = new Set([
   '/api/v1/users/login',
   '/api/v1/users/refresh',
   '/api/v2/users/login',
   '/api/v2/users/refresh'
]);

/**
 * Validate whether the JWT token is valid
 * @param c
 * @param next
 * @returns
 */
async function validateJWT(c: Context, next: Next) {
   if (publicRoutes.has(c.req.path)) {
      return next();
   }

   await jwt({
      secret: process.env.JWT_SECRET!,
      alg: 'HS256'
   })(c, next);
}

/**
 * Uses the JWT token to get the users information and store it in the request
 * @param c
 * @param next
 * @returns
 */
async function getUserFromJWT(c: Context, next: Next) {
   if (publicRoutes.has(c.req.path)) {
      return next();
   }

   const payload = c.get('jwtPayload');

   if (payload.type === 'refresh') {
      return unauthorisedError(c);
   }

   const user = await prisma.user.findUnique({
      where: {
         id: Number(payload.sub)
      },
      include: {
         role: {
            include: {
               permissions: {
                  select: {
                     name: true
                  }
               }
            }
         }
      }
   });

   if (!user) {
      return notFoundError(c);
   }

   c.set('user', user);

   await next();
}

export { validateJWT, getUserFromJWT };
