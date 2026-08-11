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

      // Try and get the asset from the asset from
      const asset = await prisma.asset.findUnique({
         where: {
            id,
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
      });

      // Check if the asset exists
      if (!asset) {
         return notFoundError(c, `Asset with id ${id} could not be found.`);
      }

      return c.json(serializeAsset({ ...asset, jsonPosition: 0 }), 200);
   } catch (err) {
      return internalServerError(c, err);
   }
});
