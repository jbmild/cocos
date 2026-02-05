import { Request, Response } from 'express';
import { InstrumentService } from '../services/InstrumentService';
import { SearchInstrumentsQuery } from '../validators/instrumentValidators';

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
      const { q: query, limit, offset } = (req as any).validated as SearchInstrumentsQuery;

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
