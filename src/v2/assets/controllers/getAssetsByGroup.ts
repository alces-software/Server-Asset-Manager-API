import { Hono } from 'hono';

import { prisma } from '../../../lib/prisma';
import { forbiddenError, internalServerError, notFoundError } from '../../../lib/errorMessages';
import { assetInclude, serializeAsset } from '../lib/util';
import { idParamValidator, paginationQueryValidator } from '../../../lib/validators';
import { validatePermissions } from '../../../lib/util';

export default new Hono().get(
   '/',
   idParamValidator({}),
   paginationQueryValidator({}),
   async (c) => {
      try {
         // Check user permissions
         if (!validatePermissions(['asset.read'], c)) {
            return forbiddenError(c);
         }

         // Get request information
         const { id } = c.req.valid('param');
         const { page, limit } = c.req.valid('query');

         // Try and get the group from the database
         const group = await prisma.group.findUnique({
            where: {
               id
            }
         });

         // Check if the asset exists
         if (!group) {
            return notFoundError(c);
         }

         // Get all the assets
         const [assets, total] = await prisma.$transaction([
            prisma.asset.findMany({
               where: {
                  groupId: id
               },
               include: {
                  ...assetInclude
               },
               skip: (page - 1) * limit,
               take: limit
            }),

            prisma.asset.count({
               where: {
                  groupId: id
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
   }
);
