import { Hono } from 'hono';

import { prisma } from '../../../lib/prisma';
import { forbiddenError, internalServerError, notFoundError } from '../../../lib/errorMessages';
import { idParamValidator } from '../../../lib/validators';
import { validatePermissions } from '../../../lib/util';

export default new Hono().get('/', idParamValidator({}), async (c) => {
   try {
      // Check users permissions
      if (!validatePermissions(['role.read'], c)) {
         return forbiddenError(c);
      }

      // Get request information
      const { id } = c.req.valid('param');

      // Get the role from the database
      const role = await prisma.role.findUnique({
         where: {
            id
         },
         include: {
            permissions: true
         }
      });

      // Check if the role exists
      if (!role) {
         return notFoundError(c);
      }

      return c.json(
         {
            id: role.id,
            name: role.name,
            permissions: role.permissions.map((name) => name)
         },
         200
      );
   } catch (err) {
      return internalServerError(c, err);
   }
});
