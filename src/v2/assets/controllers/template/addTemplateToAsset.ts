import { Hono } from 'hono';
import { z } from 'zod';

import { prisma } from '../../../../lib/prisma';
import { validatePermissions } from '../../../../lib/util';
import { forbiddenError, internalServerError, notFoundError } from '../../../../lib/errorMessages';
import { serializePath } from '../../lib/util';
import { idParamValidator } from '../../../../lib/validators';

export default new Hono().post(
   '/',
   idParamValidator({
      templateId: z
         .number({ error: 'Template ID must be a number' })
         .int({ error: 'Path ID must be a whole number' })
         .min(1, { error: 'Template ID needs to be greater than 0' })
   }),
   async (c) => {
      try {
         // Check users permissions
         if (!validatePermissions(['asset.read', 'asset.update'], c)) {
            return forbiddenError(c);
         }

         // Get information from request
         const { id, templateId } = c.req.valid('param');

         // Try and get the asser from the database
         const existingAsset = await prisma.asset.findUnique({
            where: {
               id
            },
            include: {
               json: {
                  select: {
                     id: true,
                     rawJson: true
                  },
                  orderBy: {
                     uploadDate: 'desc' as const
                  },
                  take: 1
               }
            }
         });

         // Check whether the asset exists
         if (!existingAsset) {
            return notFoundError(c);
         }

         // Get the template from the database
         const paths = await prisma.template.findUnique({
            where: {
               id: templateId
            },
            include: {
               paths: true
            }
         });

         // Check whether the template exists
         if (!paths) {
            return notFoundError(c);
         }

         // Add the paths to the asset
         const updatedAsset = await prisma.asset.update({
            where: {
               id
            },
            data: {
               paths: {
                  createMany: {
                     data: paths.paths.map((path) => ({
                        name: path.name,
                        path: path.path,
                        assetId: id
                     }))
                  }
               }
            },
            include: {
               paths: true
            }
         })

         return c.json(
            updatedAsset.paths.map((path) => {
               return serializePath(path, existingAsset.json[0]?.rawJson);
            }),
            201
         );
      } catch (err) {
         return internalServerError(c, err);
      }
   }
);
