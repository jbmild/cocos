import { MarketDataService } from '../MarketDataService';
import { AppDataSource } from '../../config/database';
import { MarketData } from '../../entities/MarketData';
import { Repository, QueryRunner } from 'typeorm';
import { NotFoundError } from '../../errors/NotFoundError';

jest.mock('../../config/database');

describe('MarketDataService', () => {
  let service: MarketDataService;
  let mockRepository: jest.Mocked<Repository<MarketData>>;

  beforeEach(() => {
    const mockManagerFindOne = jest.fn();
    const mockManager = {
      findOne: mockManagerFindOne,
    };

    mockRepository = {
      findOne: jest.fn(),
      manager: mockManager as any,
    } as any;

    (AppDataSource.getRepository as jest.Mock) = jest.fn(() => mockRepository);
    service = new MarketDataService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMarketPrice', () => {
    it('should return market price when market data exists', async () => {
      const mockMarketData = new MarketData();
      mockMarketData.id = 1;
      mockMarketData.instrumentId = 47;
      mockMarketData.close = 925.85;
      mockMarketData.date = new Date('2023-07-14');

      (mockRepository.manager.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockMarketData);

      const result = await service.getMarketPrice(47);

      expect(mockRepository.manager.findOne).toHaveBeenCalledWith(MarketData, {
        where: { instrumentId: 47 },
        order: { date: 'DESC' },
      });
      expect(mockRepository.findOne).not.toHaveBeenCalled();
      expect(result).toBe(925.85);
    });

    it('should throw NotFoundError when market data does not exist', async () => {
      (mockRepository.manager.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(service.getMarketPrice(999)).rejects.toThrow(NotFoundError);
      await expect(service.getMarketPrice(999)).rejects.toThrow('Market price not available for instrument 999');

      expect(mockRepository.manager.findOne).toHaveBeenCalledWith(MarketData, {
        where: { instrumentId: 999 },
        order: { date: 'DESC' },
      });
    });

    it('should use QueryRunner manager when provided', async () => {
      const mockMarketData = new MarketData();
      mockMarketData.id = 1;
      mockMarketData.instrumentId = 47;
      mockMarketData.close = 925.85;
      mockMarketData.date = new Date('2023-07-14');

      const mockQueryRunner = {
        manager: {
          findOne: jest.fn().mockResolvedValue(mockMarketData),
        },
      } as unknown as QueryRunner;

      const result = await service.getMarketPrice(47, mockQueryRunner);

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(MarketData, {
        where: { instrumentId: 47 },
        order: { date: 'DESC' },
      });
      expect(mockRepository.findOne).not.toHaveBeenCalled();
      expect(result).toBe(925.85);
    });

    it('should throw NotFoundError when using QueryRunner and market data does not exist', async () => {
      const mockQueryRunner = {
        manager: {
          findOne: jest.fn().mockResolvedValue(null),
        },
      } as unknown as QueryRunner;

      await expect(service.getMarketPrice(999, mockQueryRunner)).rejects.toThrow(NotFoundError);
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(MarketData, {
        where: { instrumentId: 999 },
        order: { date: 'DESC' },
      });
    });
  });
});
