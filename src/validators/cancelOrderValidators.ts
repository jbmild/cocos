import { z } from 'zod';

export const cancelOrderParamsSchema = z.object({
  orderId: z.string().regex(/^\d+$/, 'Order ID must be a valid number').transform(Number),
});

export type CancelOrderParams = z.infer<typeof cancelOrderParamsSchema>;
