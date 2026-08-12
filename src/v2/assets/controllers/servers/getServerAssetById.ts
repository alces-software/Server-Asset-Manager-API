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

      // Try and get the server from the asset from
      const server = await prisma.asset.findUnique({
         where: {
            id,
            server: {
               isNot: null
            }
         },
         include: {
            ...assetInclude,
            server: true
         }
      });

      // Check if the server exists
      if (!server) {
         return notFoundError(c, `Server with id ${id} could not be found.`);
      }

      return c.json(
         serializeAsset(
            { ...server, jsonPosition: 0 },
            { size: server.server?.size, model: server.server?.model }
         ),
         200
      );
   } catch (err) {
      return internalServerError(c, err);
   }
});
