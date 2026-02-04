import { Request, Response } from 'express';
import { InstrumentService } from '../services/InstrumentService';
import { searchInstrumentsSchema } from '../validators/instrumentValidators';
import { ZodIssue } from 'zod';

export class InstrumentController {
  private instrumentService: InstrumentService;

  constructor() {
    this.instrumentService = new InstrumentService();
  }

  /**
   * GET /instruments/search?q=query&limit=50&offset=0 - busca instrumentos por ticker y/o nombre
   */
  search = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validar query parameters con Zod
      const validationResult = searchInstrumentsSchema.safeParse(req.query);

      if (!validationResult.success) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid query parameters',
          details: validationResult.error.issues.map((err: ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      const { q: query, limit, offset } = validationResult.data;

      // Obtener instrumentos y total
      const [instruments, total] = await Promise.all([
        this.instrumentService.searchInstruments(query, limit, offset),
        this.instrumentService.countInstruments(query),
      ]);

      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: instruments,
        pagination: {
          total,
          count: instruments.length,
          limit,
          offset,
          currentPage,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error searching instruments:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while searching instruments',
      });
    }
  };
}
