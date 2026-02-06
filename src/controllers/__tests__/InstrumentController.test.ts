import { Request, Response } from 'express';
import { InstrumentController } from '../InstrumentController';
import { InstrumentService } from '../../services/InstrumentService';
import { Instrument } from '../../entities/Instrument';

jest.mock('../../services/InstrumentService');

describe('InstrumentController', () => {
  let controller: InstrumentController;
  let mockInstrumentService: jest.Mocked<InstrumentService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockInstrumentService = {
      searchInstruments: jest.fn(),
      countInstruments: jest.fn(),
    } as any;

    (InstrumentService as jest.MockedClass<typeof InstrumentService>).mockImplementation(() => mockInstrumentService);

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();

    mockRequest = {
      validated: {
        q: 'test',
        limit: 10,
        offset: 0,
      },
    } as any;

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    controller = new InstrumentController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should return instruments with pagination', async () => {
      const mockInstruments: Instrument[] = [
        { id: 1, ticker: 'AAPL', name: 'Apple Inc.', type: 'ACCIONES' as any },
        { id: 2, ticker: 'GOOGL', name: 'Google Inc.', type: 'ACCIONES' as any },
      ];

      mockInstrumentService.searchInstruments = jest.fn().mockResolvedValue(mockInstruments);
      mockInstrumentService.countInstruments = jest.fn().mockResolvedValue(100);

      await controller.search(mockRequest as Request, mockResponse as Response);

      expect(mockInstrumentService.searchInstruments).toHaveBeenCalledWith('test', 10, 0);
      expect(mockInstrumentService.countInstruments).toHaveBeenCalledWith('test');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockInstruments,
        pagination: {
          total: 100,
          count: 2,
          limit: 10,
          offset: 0,
          currentPage: 1,
          totalPages: 10,
        },
      });
    });

    it('should calculate pagination correctly', async () => {
      const mockInstruments: Instrument[] = [];
      mockInstrumentService.searchInstruments = jest.fn().mockResolvedValue(mockInstruments);
      mockInstrumentService.countInstruments = jest.fn().mockResolvedValue(50);

      (mockRequest as any).validated = {
        q: 'test',
        limit: 10,
        offset: 20,
      };

      await controller.search(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            total: 50,
            count: 0,
            limit: 10,
            offset: 20,
            currentPage: 3,
            totalPages: 5,
          },
        })
      );
    });

    it('should handle empty query', async () => {
      const mockInstruments: Instrument[] = [];
      mockInstrumentService.searchInstruments = jest.fn().mockResolvedValue(mockInstruments);
      mockInstrumentService.countInstruments = jest.fn().mockResolvedValue(0);

      (mockRequest as any).validated = {
        q: undefined,
        limit: 50,
        offset: 0,
      };

      await controller.search(mockRequest as Request, mockResponse as Response);

      expect(mockInstrumentService.searchInstruments).toHaveBeenCalledWith(undefined, 50, 0);
      expect(mockInstrumentService.countInstruments).toHaveBeenCalledWith(undefined);
    });
  });
});
