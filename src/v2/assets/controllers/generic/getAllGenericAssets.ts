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

      // Get all the generic assets from the database
      const [assets, total] = await prisma.$transaction([
         prisma.asset.findMany({
            where: {
               storageType: {
                  is: null
               },
               server: {
                  is: null
               },
               ups: {
                  is: null
               },
               pdu: {
                  is: null
               }
            },
            include: {
               ...assetInclude
            }
         }),

         prisma.asset.count({
            where: {
               storageType: {
                  is: null
               },
               server: {
                  is: null
               },
               ups: {
                  is: null
               },
               pdu: {
                  is: null
               }
            }
         })
      ]);

      return c.json(
         {
            servers: assets.map((asset) => ({
               ...serializeAsset({ ...asset, jsonPosition: 0 })
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
