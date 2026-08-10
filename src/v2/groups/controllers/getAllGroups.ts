import { Hono } from 'hono';

import { prisma } from '../../../lib/prisma';
import { forbiddenError, internalServerError } from '../../../lib/errorMessages';
import { paginationQueryValidator } from '../../../lib/validators';
import { validatePermissions } from '../../../lib/util';

export default new Hono().get('/', paginationQueryValidator({}), async (c) => {
   try {
      // Check user permissions
      if (!validatePermissions(['group.read'], c)) {
         return forbiddenError(c);
      }

      // Get request information
      const { page, limit } = c.req.valid('query');

      // Get all the groups
      const [groups, total] = await prisma.$transaction([
         prisma.group.findMany({
            skip: (page - 1) * limit,
            take: limit
         }),

         prisma.group.count()
      ]);

      return c.json(
         {
            groups: groups.map((group) => ({
               id: group.id,
               name: group.name
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
