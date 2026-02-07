import { MarketDataService } from '../MarketDataService';
import { AppDataSource } from '../../config/database';
import { MarketData } from '../../entities/MarketData';
import { Repository } from 'typeorm';
import { NotFoundError } from '../../errors/NotFoundError';

jest.mock('../../config/database');

describe('MarketDataService', () => {
  let service: MarketDataService;
  let mockRepository: jest.Mocked<Repository<MarketData>>;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
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

      mockRepository.findOne = jest.fn().mockResolvedValue(mockMarketData);

      const result = await service.getMarketPrice(47);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { instrumentId: 47 },
        order: { date: 'DESC' },
      });
      expect(result).toBe(925.85);
    });

    it('should throw NotFoundError when market data does not exist', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.getMarketPrice(999)).rejects.toThrow(NotFoundError);
      await expect(service.getMarketPrice(999)).rejects.toThrow('Market price not available for instrument 999');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { instrumentId: 999 },
        order: { date: 'DESC' },
      });
    });
  });
});
