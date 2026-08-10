import { Hono } from 'hono';

import { prisma } from '../../../../lib/prisma';
import { forbiddenError, internalServerError } from '../../../../lib/errorMessages';
import { assetInclude, serializeAsset } from '../../lib/util';
import { paginationQueryValidator } from '../../../../lib/validators';
import { z } from 'zod';
import { validatePermissions } from '../../../../lib/util';

export default new Hono().get(
   '/',
   paginationQueryValidator({
      tags: z
         .string({ error: 'Tags must be a string' })
         .trim()
         .min(1, { error: 'Tags cannot be empty' })
         .transform((value) => value.split(',').filter(Boolean).map(Number))
         .pipe(
            z
               .array(z.number().int().positive(), {
                  error: 'Tags must contain valid IDs'
               })
               .min(1, { error: 'At least one tag is required' })
         )
   }),
   async (c) => {
      try {
         // Check user permissions
         if (!validatePermissions(['asset.read'], c)) {
            return forbiddenError(c);
         }

         // Get request information
         const { page, limit, tags } = c.req.valid('query');

         // Get all the assets
         const [assets, total] = await prisma.$transaction([
            prisma.asset.findMany({
               where: {
                  tags: {
                     some: {
                        id: {
                           in: tags
                        }
                     }
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
                  tags: {
                     some: {
                        id: {
                           in: tags
                        }
                     }
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
   }
);
