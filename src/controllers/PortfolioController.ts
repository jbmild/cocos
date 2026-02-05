import { Request, Response } from 'express';
import { PortfolioService } from '../services/PortfolioService';
import { UserIdParams } from '../validators/portfolioValidators';

export class PortfolioController {
  private portfolioService: PortfolioService;

  constructor() {
    this.portfolioService = new PortfolioService();
  }

  /**
   * GET /portfolio/:userId - obtiene el portfolio
   */
  getPortfolio = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as any).validated as UserIdParams;

      const portfolio = await this.portfolioService.getPortfolio(userId);

      res.json({
        success: true,
        data: portfolio,
      });
    } catch (error) {
      console.error('Error getting portfolio:', error);
      
      // Si es un error de estado inconsistente, devolver 400 con mensaje especifico
      if (error instanceof Error && error.message.includes('inconsistent state')) {
        res.status(400).json({
          error: 'Portfolio inconsistent state',
          message: error.message,
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while getting the portfolio',
      });
    }
  };
}
