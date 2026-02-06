import { InstrumentService } from '../InstrumentService';
import { AppDataSource } from '../../config/database';
import { Instrument } from '../../entities/Instrument';
import { Repository, ILike, Raw } from 'typeorm';

jest.mock('../../config/database');

describe('InstrumentService', () => {
  let service: InstrumentService;
  let mockRepository: jest.Mocked<Repository<Instrument>>;

  beforeEach(() => {
    mockRepository = {
      find: jest.fn(),
      count: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock) = jest.fn(() => mockRepository);
    service = new InstrumentService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchInstruments', () => {
    it('should return all instruments when query is empty', async () => {
      const mockInstruments: Instrument[] = [
        { id: 1, ticker: 'AAPL', name: 'Apple Inc.', type: 'ACCIONES' as any },
        { id: 2, ticker: 'GOOGL', name: 'Google Inc.', type: 'ACCIONES' as any },
      ];

      mockRepository.find = jest.fn().mockResolvedValue(mockInstruments);

      const result = await service.searchInstruments();

      expect(mockRepository.find).toHaveBeenCalledWith({
        take: 50,
        skip: 0,
        order: { ticker: 'ASC' },
      });
      expect(result).toEqual(mockInstruments);
    });

    it('should search by ticker and name when query is provided', async () => {
      const mockInstruments: Instrument[] = [
        { id: 1, ticker: 'AAPL', name: 'Apple Inc.', type: 'ACCIONES' as any },
      ];

      mockRepository.find = jest.fn().mockResolvedValue(mockInstruments);

      const result = await service.searchInstruments('AAPL', 10, 5);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expect.arrayContaining([
          expect.objectContaining({
            ticker: expect.anything(),
          }),
          expect.objectContaining({
            name: expect.anything(),
          }),
        ]),
        take: 10,
        skip: 5,
        order: { ticker: 'ASC' },
      });
      expect(result).toEqual(mockInstruments);
    });

    it('should use default limit and offset when not provided', async () => {
      const mockInstruments: Instrument[] = [];
      mockRepository.find = jest.fn().mockResolvedValue(mockInstruments);

      await service.searchInstruments('test');

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      );
    });

    it('should trim query before searching', async () => {
      const mockInstruments: Instrument[] = [];
      mockRepository.find = jest.fn().mockResolvedValue(mockInstruments);

      await service.searchInstruments('  test  ');

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Array),
        })
      );
    });
  });

  describe('countInstruments', () => {
    it('should return total count when query is empty', async () => {
      mockRepository.count = jest.fn().mockResolvedValue(100);

      const result = await service.countInstruments();

      expect(mockRepository.count).toHaveBeenCalledWith();
      expect(result).toBe(100);
    });

    it('should count matching instruments when query is provided', async () => {
      mockRepository.count = jest.fn().mockResolvedValue(5);

      const result = await service.countInstruments('AAPL');

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: expect.arrayContaining([
          expect.objectContaining({
            ticker: expect.anything(),
          }),
          expect.objectContaining({
            name: expect.anything(),
          }),
        ]),
      });
      expect(result).toBe(5);
    });

  });
});
