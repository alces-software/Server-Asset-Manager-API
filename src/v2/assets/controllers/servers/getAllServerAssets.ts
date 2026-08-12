import { Hono } from 'hono';

import { prisma } from '../../../../lib/prisma';
import { forbiddenError, internalServerError } from '../../../../lib/errorMessages';
import { assetInclude, serializeAsset } from '../../lib/util';
import { paginationQueryValidator } from '../../../../lib/validators';
import { validatePermissions } from '../../../../lib/util';

export default new Hono().get('/', paginationQueryValidator({}), async (c) => {
   try {
      // Check user permissions
      if (!validatePermissions(['asset.read'], c)) {
         return forbiddenError(c);
      }

      // Get information from the request
      const { page, limit } = c.req.valid('query');

      // Get all the servers
      const [servers, total] = await prisma.$transaction([
         prisma.asset.findMany({
            where: {
               server: {
                  isNot: null
               }
            },
            include: {
               ...assetInclude,
               server: {
                  select: {
                     size: true,
                     model: true
                  }
               }
            }
         }),

         prisma.server.count()
      ]);

      return c.json(
         {
            servers: servers.map((server) => ({
               ...serializeAsset(
                  { ...server, jsonPosition: 0 },
                  {
                     size: server.server?.size,
                     model: server.server?.model
                  }
               )
            })),
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
         },
         200
      );
   } catch (err) {
      return internalServerError(c, err);
   }
});
