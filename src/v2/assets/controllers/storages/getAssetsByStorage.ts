import { Hono } from 'hono';

import { prisma } from '../../../../lib/prisma';
import { forbiddenError, internalServerError, notFoundError } from '../../../../lib/errorMessages';
import { assetInclude, serializeAsset } from '../../lib/util';
import { idParamValidator, paginationQueryValidator } from '../../../../lib/validators';
import { validatePermissions } from '../../../../lib/util';

export default new Hono().get(
   '/',
   idParamValidator({}),
   paginationQueryValidator({}),
   async (c) => {
      try {
         // Check user permissions
         if (!validatePermissions(['asset.read'], c)) {
            return forbiddenError(c);
         }

         // Get request information
         const { id } = c.req.valid('param');
         const { page, limit } = c.req.valid('query');

         // Try and get the group from the database
         const storage = await prisma.asset.findUnique({
            where: {
               id,
               storageType: {
                  isNot: null
               }
            }
         });

         // Check if the asset exists
         if (!storage) {
            return notFoundError(c, `Storage with id: ${id}, could not be found.`);
         }

         // Get all the assets
         const [assets, total] = await prisma.$transaction([
            prisma.asset.findMany({
               where: {
                  storageId: id
               },
               include: {
                  ...assetInclude,
                  server: true,
                  storageType: true,
                  ups: true,
                  pdu: true
               },
               skip: (page - 1) * limit,
               take: limit
            }),

            prisma.asset.count({
               where: {
                  groupId: id
               }
            })
         ]);

         return c.json(
            {
               assets: assets.map((asset) => {
                  let assetType: 'server' | 'storage' | 'ups' | 'pdu' | 'asset' = 'asset';
                  let extras = {}

                  if (asset.server) {
                     assetType = 'server';
                     extras = { ...asset.server }
                  } else if (asset.storageType) {
                     assetType = 'storage';
                     extras = { ...asset.storageType }
                  } else if (asset.ups) {
                     assetType = 'ups';
                     extras = { ...asset.ups }
                  } else if (asset.pdu) {
                     assetType = 'pdu';
                     extras = { ...asset.pdu }
                  }

                  return serializeAsset(
                     { ...asset, jsonPosition: 0 },
                     {
                        assetType: assetType as 'server' | 'storage' | 'ups' | 'pdu' | 'asset',
                        ...extras
                     }
                  );
               }),
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
