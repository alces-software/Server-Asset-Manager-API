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

      // Get all the pdus
      const [pdus, total] = await prisma.$transaction([
         prisma.asset.findMany({
            where: {
               pdu: {
                  isNot: null
               }
            },
            include: {
               ...assetInclude,
               pdu: {
                  select: {
                     outletCount: true
                  }
               }
            }
         }),

         prisma.storage.count()
      ]);

      return c.json(
         {
            pdus: pdus.map((pdu) => ({
               ...serializeAsset(
                  { ...pdu, jsonPosition: 0 },
                  {
                     capacity: pdu.pdu?.outletCount
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
