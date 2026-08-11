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

      // Try and get the pdu from the asset from
      const pdu = await prisma.asset.findUnique({
         where: {
            id,
            pdu: {
               isNot: null
            }
         },
         include: {
            ...assetInclude,
            pdu: {
               select: {
                  outletCount: true
               }
            }
         }
      });

      // Check if the pdu exists
      if (!pdu) {
         return notFoundError(c, `PDU with id: ${id} could not be found.`);
      }

      return c.json(
         serializeAsset({ ...pdu, jsonPosition: 0 }, { outletCount: pdu.pdu?.outletCount }),
         200
      );
   } catch (err) {
      return internalServerError(c, err);
   }
});
