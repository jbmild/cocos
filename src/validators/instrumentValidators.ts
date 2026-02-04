import { z } from 'zod';

/**
 * Schema de validación para la búsqueda de instrumentos
 */
export const searchInstrumentsSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .default(50),
  offset: z.coerce
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .default(0),
});

export type SearchInstrumentsQuery = z.infer<typeof searchInstrumentsSchema>;
