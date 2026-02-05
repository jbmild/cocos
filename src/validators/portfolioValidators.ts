import { z } from 'zod';

export const userIdSchema = z.object({
  userId: z.coerce.number().int('User ID must be an integer'),
});

export type UserIdParams = z.infer<typeof userIdSchema>;
