import { Hono } from 'hono';

import { prisma } from '../../../lib/prisma';
import { forbiddenError, internalServerError, notFoundError } from '../../../lib/errorMessages';
import { idParamValidator } from '../../../lib/validators';
import { validatePermissions } from '../../../lib/util';

export default new Hono().delete('/', idParamValidator({}), async (c) => {
   try {
      // Check users permissions
      if (!validatePermissions(['tag.read'], c)) {
         return forbiddenError(c);
      }

      // Get request information
      const { id } = c.req.valid('param');

      // Try and get the group from the database
      const tag = await prisma.tag.findUnique({
         where: {
            id
         }
      });

      // Check if the tag exists
      if (!tag) {
         return notFoundError(c);
      }

      return c.json(
         {
            id: tag.id,
            name: tag.name
         },
         200
      );
   } catch (err) {
      return internalServerError(c, err);
   }
});
