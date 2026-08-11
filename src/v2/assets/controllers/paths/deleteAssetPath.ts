import { Hono } from 'hono';
import { z } from 'zod';

import { prisma } from '../../../../lib/prisma';
import { forbiddenError, internalServerError, notFoundError } from '../../../../lib/errorMessages';
import { validatePermissions } from '../../../../lib/util';
import { idParamValidator } from '../../../../lib/validators';

export default new Hono().delete(
   '/',
   idParamValidator({
      pathId: z.coerce
         .number({ error: 'Path ID must be a number' })
         .int({ error: 'Path ID must be a whole number' })
         .positive({ error: 'Path ID must be greater than 0' })
   }),
   async (c) => {
      try {
         // Check user permissions
         if (!validatePermissions(['asset.read', 'asset.update'], c)) {
            return forbiddenError(c);
         }

         // Get request information
         const { id, pathId } = c.req.valid('param');

         // Try and get the asset from the database
         const asset = await prisma.asset.findFirst({
            where: {
               id
            }
         });

         // Check whether the asset exists
         if (!asset) {
            return notFoundError(c, `Asset with id: ${id} could not be found.`);
         }

         // Get the path checking that in matches the asset id and the path id
         const path = await prisma.assetPath.findFirst({
            where: {
               id: pathId,
               assetId: id
            },
            select: {
               id: true
            }
         });

         // Checks if the path exists
         if (!path) {
            return notFoundError(c, `Path with id: ${id} could not be found.`);
         }

         // Delete the path
         await prisma.assetPath.delete({
            where: {
               id: pathId
            }
         });

         return c.json(204);
      } catch (err) {
         return internalServerError(c, err);
      }
   }
);
