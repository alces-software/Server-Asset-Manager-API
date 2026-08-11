import { prisma } from '../../../lib/prisma';
import { getValueFromJson } from '../../../lib/util';

/**
 * Creates the build request with the data passed in
 * @param body
 * @returns
 */
function buildBaseAssetSchema(body: {
   name: string;
   groupId?: number;
   tags: number[];
   paths: { name: string; path: string }[];
   json?: string | null;
}) {
   return {
      name: body.name,
      ...(body.groupId !== undefined && {
         groupId: body.groupId
      }),
      ...(body.json != null && {
         json: {
            create: {
               rawJson: body.json
            }
         }
      }),
      ...(body.tags.length > 0 && {
         tags: {
            connect: body.tags.map((id) => ({ id }))
         }
      }),
      paths: {
         createMany: {
            data: body.paths
         }
      }
   };
}

/**
 * Creates the asset in it's standardised for with the data passed in
 * @param asset
 * @param extra
 * @returns
 */
function serializeAsset(
   asset: {
      id: number;
      name: string;
      storageId: number | null;
      storage: {
         asset: {
            name: string;
         };
      } | null;
      notes: string | null;
      group: { id: number; name: string } | null;
      tags: { id: number; name: string }[];
      paths: { id: number; name: string; path: string }[];
      json: { rawJson: string; id: number }[];
      jsonPosition: number | null;
      position: number;
      _count: { json: number };
   },
   extra: Record<string, unknown> = {}
) {
   return {
      id: asset.id,
      name: asset.name,
      notes: asset.notes,
      position: asset.position,
      ...extra,
      storage: {
         id: asset.storageId,
         name: asset.storage?.asset.name
      },
      group: {
         id: asset.group?.id,
         name: asset.group?.name
      },
      tags: asset.tags.map((tag) => ({
         id: tag.id,
         navigation: tag.name
      })),
      paths: asset.paths.map((path) => {
         return serializePath(path, asset.json[0]?.rawJson);
      }),
      json: asset.json[0]
         ? {
            id: asset.json[0].id,
            rawJson: asset.json[0].rawJson,
            position: asset.jsonPosition,
            total: asset._count.json
         }
         : null
   };
}

/**
 * Creates the path in the standardised form using the data passed in
 * @param path
 * @param json
 * @returns
 */
function serializePath(
   path: {
      id: number;
      name: string;
      path: string;
   },
   json: string | null
) {
   return {
      id: path.id,
      name: path.name,
      path: path.path,
      value: getValueFromJson(JSON.parse(json ?? ''), path.path)
   };
}

/**
 * The standard includes for assets
 */
const assetInclude = {
   group: true,
   tags: true,
   paths: true,
   json: {
      select: {
         id: true,
         rawJson: true
      },
      orderBy: {
         uploadDate: 'desc' as const
      },
      take: 1
   },
   storage: {
      include: {
         asset: {
            select: {
               name: true
            }
         }
      }
   },
   _count: {
      select: {
         json: true
      }
   }
};

/**
 * Checks whether a storage can be moved into the new storage checking for circles of any sort
 * @param storageId
 * @param newParentId
 * @returns
 */
async function canMoveStorage(storageId: number, newParentId: number): Promise<boolean> {
   let current = await prisma.storage.findUnique({
      where: { id: newParentId },
      include: {
         asset: {
            select: {
               storageId: true
            }
         }
      }
   });

   const visited = new Set<number>();

   while (current) {
      if (current.id === storageId) {
         return false;
      }

      if (visited.has(current.id)) {
         return false;
      }

      visited.add(current.id);

      if (!current.asset.storageId) {
         break;
      }

      current = await prisma.storage.findUnique({
         where: { id: current.asset.storageId },
         include: {
            asset: {
               select: {
                  storageId: true
               }
            }
         }
      });
   }

   return true;
}

export { buildBaseAssetSchema, assetInclude, serializeAsset, serializePath, canMoveStorage };
