import { Request, Response } from 'express';
import { PortfolioController } from '../PortfolioController';
import { PortfolioService } from '../../services/PortfolioService';
import { Portfolio } from '../../services/PortfolioService';

jest.mock('../../services/PortfolioService');

describe('PortfolioController', () => {
  let controller: PortfolioController;
  let mockPortfolioService: jest.Mocked<PortfolioService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockPortfolioService = {
      getPortfolio: jest.fn(),
    } as any;

    (PortfolioService as jest.MockedClass<typeof PortfolioService>).mockImplementation(() => mockPortfolioService);

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();

    mockRequest = {
      validated: {
        userId: 1,
      },
    } as any;

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    controller = new PortfolioController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPortfolio', () => {
    it('should return portfolio successfully', async () => {
      const mockPortfolio: Portfolio = {
        totalValue: 1000,
        availableCash: 500,
        positions: [
          {
            instrumentId: 1,
            ticker: 'AAPL',
            name: 'Apple Inc.',
            quantity: 10,
            marketValue: 500,
            totalReturn: 10,
          },
        ],
        positionsMap: new Map(),
      };

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);

      await controller.getPortfolio(mockRequest as Request, mockResponse as Response);

      expect(mockPortfolioService.getPortfolio).toHaveBeenCalledWith(1);
      // Verificar que positionsMap no se incluye en la respuesta
      const { positionsMap, ...expectedData } = mockPortfolio;
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expectedData,
      });
    });

    it('should return 400 for inconsistent state error', async () => {
      const error = new Error('Portfolio is in an inconsistent state according to platform rules. Negative cash balance detected.');
      mockPortfolioService.getPortfolio = jest.fn().mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await controller.getPortfolio(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Portfolio inconsistent state',
        message: error.message,
      });

      consoleSpy.mockRestore();
    });
    
  });
});
