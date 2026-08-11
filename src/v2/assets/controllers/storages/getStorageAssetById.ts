import { Hono } from 'hono';

import { prisma } from '../../../../lib/prisma';
import { forbiddenError, internalServerError, notFoundError } from '../../../../lib/errorMessages';
import { assetInclude, serializeAsset } from '../../lib/util';
import { idParamValidator } from '../../../../lib/validators';
import { validatePermissions } from '../../../../lib/util';

export default new Hono().get('/', idParamValidator({}), async (c) => {
   try {
      // Check user permissions
      if (!validatePermissions(['asset.read'], c)) {
         return forbiddenError(c);
      }

      // Get request information
      const { id } = c.req.valid('param');

      // Try and get the storage from the asset from
      const storage = await prisma.asset.findUnique({
         where: {
            id,
            storageType: {
               isNot: null
            }
         },
         include: {
            ...assetInclude,
            storageType: {
               select: {
                  size: true
               }
            }
         }
      });

      // Check if the storage exists
      if (!storage) {
         return notFoundError(c, `Storage with id: ${id}, could not be found.`);
      }

      return c.json(
         serializeAsset(
            { ...storage, jsonPosition: 0 },
            {
               size: storage.storageType?.size
            }
         ),
         200
      );
   } catch (err) {
      return internalServerError(c, err);
   }
});
