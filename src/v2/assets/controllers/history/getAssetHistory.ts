import { Hono } from 'hono';

import { prisma } from '../../../../lib/prisma';
import { internalServerError, notFoundError } from '../../../../lib/errorMessages';
import { idParamValidator, paginationQueryValidator } from '../../../../lib/validators';

export default new Hono().get(
   '/',
   idParamValidator({}),
   paginationQueryValidator({}),
   async (c) => {
      try {
         // Get request information
         const { id } = c.req.valid('param');
         const { page, limit } = c.req.valid('query');

         // Try and get the asset from the database
         const asset = await prisma.asset.findUnique({
            where: {
               id
            },
            include: {
               json: {
                  orderBy: {
                     uploadDate: 'desc'
                  },
                  select: {
                     id: true,
                     rawJson: true
                  }
               },
               _count: {
                  select: {
                     json: true
                  }
               }
            }
         });

         // Check if the asset exists
         if (!asset) {
            return notFoundError(c);
         }

         return c.json(
            {
               page,
               limit,
               total: asset._count.json,
               totalPage: Math.ceil(asset._count.json / limit),
               history: asset.json.map((json) => ({
                  id: json.id,
                  rawJson: json.rawJson
               }))
            },
            200
         );
      } catch (err) {
         return internalServerError(c, err);
      }
   }
);
