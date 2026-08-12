import { z } from 'zod';

/**
 * The default asset creation input schema
 */
export const assetSchema = z.object({
   name: z
      .string({ error: 'Name must be a string' })
      .trim()
      .min(1, { error: 'Name cannot be empty' }),
   json: z.string({ error: 'Name must be a string' }).trim().optional(),
   notes: z.string({ error: 'Notes must be a string' }).trim().optional(),
   paths: z
      .array(
         z.object({
            name: z
               .string({ error: 'Name must be a string' })
               .trim()
               .min(1, { error: 'Name cannot be empty' }),
            path: z
               .string({ error: 'Path must be a string' })
               .trim()
               .min(1, { error: 'Path cannot be empty' })
         })
      )
      .default([]),
   groupId: z
      .number({ error: 'Group ID must be a number' })
      .int({ error: 'Group ID must be an integer' })
      .positive({ error: 'Group ID must be greater than 0' })
      .optional(),
   storageId: z
      .number({ error: 'Storage ID must be a number' })
      .int({ error: 'Storage ID must be an integer' })
      .positive({ error: 'Storage ID must be greater than 0' })
      .optional(),
   position: z
      .number({ error: 'Position must be a number' })
      .int({ error: 'Position must be an integer' })
      .nonnegative({ error: 'Position cannot be a negative number' })
      .default(0),
   tags: z
      .array(
         z
            .number({ error: 'Tag ID must be a number' })
            .int({ error: 'Tag ID must be an integer' })
            .positive({ error: 'Tag ID must be greater than 0' })
      )
      .default([])
});
