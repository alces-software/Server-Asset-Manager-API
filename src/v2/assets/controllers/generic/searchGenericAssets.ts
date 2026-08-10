import { Hono } from 'hono';

import { prisma } from '../../../../lib/prisma';
import { forbiddenError, internalServerError } from '../../../../lib/errorMessages';
import { searchQueryValidator } from '../../../../lib/validators';
import { assetInclude, serializeAsset } from '../../lib/util';
import { validatePermissions } from '../../../../lib/util';

export default new Hono().get('/', searchQueryValidator({}), async (c) => {
   try {
      // Check user permissions
      if (!validatePermissions(['asset.read'], c)) {
         return forbiddenError(c);
      }

      // Get request information
      const { query, page, limit } = c.req.valid('query');

      // Returns blank if there is no query
      if (!query) {
         return c.json([], 200);
      }

      // Search for assets
      const [assets, total] = await prisma.$transaction([
         prisma.asset.findMany({
            where: {
               OR: [
                  ...(Number.isInteger(Number(query)) ? [{ id: Number(query) }] : []),
                  {
                     name: {
                        contains: query
                     }
                  }
               ],
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
            },
            skip: (page - 1) * limit,
            take: limit
         }),

         prisma.asset.count({
            where: {
               OR: [
                  ...(Number.isInteger(Number(query)) ? [{ id: Number(query) }] : []),
                  {
                     name: {
                        contains: query
                     }
                  }
               ],
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
            assets: assets.map((asset) => serializeAsset({ ...asset, jsonPosition: 0 })),
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit)
         },
         200
      );
   } catch (err) {
      return internalServerError(c, err);
   }
});
