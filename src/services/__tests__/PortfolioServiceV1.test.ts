import { PortfolioServiceV1 } from '../portfolio/PortfolioServiceV1';
import { AppDataSource } from '../../config/database';
import { Order } from '../../entities/Order';
import { MarketData } from '../../entities/MarketData';
import { Instrument } from '../../entities/Instrument';
import { OrderStatus } from '../../enums/OrderStatus';
import { OrderSide } from '../../enums/OrderSide';
import { InstrumentType } from '../../enums/InstrumentType';
import { Repository } from 'typeorm';
import { OrderProcessorFactory } from '../order-processors/OrderProcessorFactory';
import { Portfolio, Position } from '../PortfolioService';

jest.mock('../../config/database');
jest.mock('../order-processors/OrderProcessorFactory');

describe('PortfolioServiceV1', () => {
  let service: PortfolioServiceV1;
  let mockOrderRepository: jest.Mocked<Repository<Order>>;
  let mockMarketDataRepository: jest.Mocked<Repository<MarketData>>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    mockOrderRepository = {
      find: jest.fn(),
    } as any;

    mockMarketDataRepository = {
      findOne: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity) => {
      if (entity.name === 'Order') return mockOrderRepository;
      if (entity.name === 'MarketData') return mockMarketDataRepository;
      return {};
    });

    service = new PortfolioServiceV1();
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  const createMockInstrument = (id: number, ticker: string, type: InstrumentType = InstrumentType.ACCIONES): Instrument => {
    const instrument = new Instrument();
    instrument.id = id;
    instrument.ticker = ticker;
    instrument.name = `Instrument ${ticker}`;
    instrument.type = type;
    return instrument;
  };

  const createMockOrder = (
    id: number,
    userId: number,
    instrument: Instrument | null,
    side: OrderSide,
    size: number,
    price: number,
    status: OrderStatus = OrderStatus.FILLED
  ): Order => {
    const order = new Order();
    order.id = id;
    order.userId = userId;
    (order as any).instrumentId = instrument?.id || undefined;
    (order as any).instrument = instrument || undefined;
    order.side = side;
    order.size = size;
    order.price = price;
    order.status = status;
    order.datetime = new Date();
    return order;
  };

  describe('getPortfolio', () => {
    it('should return portfolio with cash and positions', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const orders = [
        createMockOrder(1, 1, createMockInstrument(66, 'ARS', InstrumentType.MONEDA), OrderSide.CASH_IN, 1000, 1),
        createMockOrder(2, 1, instrument, OrderSide.BUY, 10, 50),
      ];

      mockOrderRepository.find = jest.fn().mockResolvedValue(orders);

      // Mock OrderProcessorFactory
      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => {
        const isCashIn = order.side === OrderSide.CASH_IN;
        const isBuy = order.side === OrderSide.BUY;
        return {
          processCash: jest.fn((cash) => {
            if (isCashIn) return cash + 1000;
            if (isBuy) return cash - 500;
            return cash;
          }),
          processPositions: jest.fn((positions) => {
            if (isBuy) {
              const newPositions = new Map(positions);
              newPositions.set(1, {
                quantity: 10,
                totalCost: 500,
                instrument,
              });
              return newPositions;
            }
            return positions;
          }),
        };
      });

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.previousClose = 55;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      const result = await service.getPortfolio(1);

      expect(result.availableCash).toBe(500); // 1000 (CASH_IN) - 500 (BUY)
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].quantity).toBe(10);
      expect(result.positions[0].marketValue).toBe(600); // 10 * 60
      expect(result.totalValue).toBe(1100); // 500 + 600
    });

    it('should exclude cash instruments from positions', async () => {
      const orders = [
        createMockOrder(1, 1, createMockInstrument(66, 'ARS', InstrumentType.MONEDA), OrderSide.CASH_IN, 1000, 1),
      ];

      mockOrderRepository.find = jest.fn().mockResolvedValue(orders);

      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      const mockProcessor = {
        processCash: jest.fn((cash) => cash + 1000),
        processPositions: jest.fn((positions) => positions),
      };
      OrderProcessorFactory.create = jest.fn().mockReturnValue(mockProcessor);

      const result = await service.getPortfolio(1);

      expect(result.positions).toHaveLength(0);
    });

    it('should throw error when cash is negative', async () => {
      const orders = [
        createMockOrder(1, 1, createMockInstrument(66, 'ARS', InstrumentType.MONEDA), OrderSide.CASH_OUT, 1000, 1),
      ];

      mockOrderRepository.find = jest.fn().mockResolvedValue(orders);

      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      const mockProcessor = {
        processCash: jest.fn((cash) => {
          return cash - 1000;
        }),
        processPositions: jest.fn((positions) => positions),
      };
      OrderProcessorFactory.create = jest.fn().mockReturnValue(mockProcessor);

      await expect(service.getPortfolio(1)).rejects.toThrow('inconsistent state');
    });

    it('should throw error when positions are negative', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const orders = [
        createMockOrder(1, 1, instrument, OrderSide.SELL, 10, 50),
      ];

      mockOrderRepository.find = jest.fn().mockResolvedValue(orders);

      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      const mockProcessor = {
        processCash: jest.fn((cash) => cash),
        processPositions: jest.fn((positions) => {
          const newPositions = new Map(positions);
          newPositions.set(1, {
            quantity: -10,
            totalCost: -500,
            instrument,
          });
          return newPositions;
        }),
      };
      OrderProcessorFactory.create = jest.fn().mockReturnValue(mockProcessor);

      await expect(service.getPortfolio(1)).rejects.toThrow('inconsistent state');
    });

    it('should calculate total return correctly', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const orders = [
        createMockOrder(1, 1, createMockInstrument(66, 'ARS', InstrumentType.MONEDA), OrderSide.CASH_IN, 1000, 1),
        createMockOrder(2, 1, instrument, OrderSide.BUY, 10, 50),
      ];

      mockOrderRepository.find = jest.fn().mockResolvedValue(orders);

      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      const mockProcessor = {
        processCash: jest.fn((cash) => {
          return cash + 1000 - 500;
        }),
        processPositions: jest.fn((positions) => {
          const newPositions = new Map(positions);
          newPositions.set(1, {
            quantity: 10,
            totalCost: 500, // avg cost = 50
            instrument,
          });
          return newPositions;
        }),
      };
      OrderProcessorFactory.create = jest.fn().mockReturnValue(mockProcessor);

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60; // current price = 60
      marketData.previousClose = 55;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      const result = await service.getPortfolio(1);

      // totalReturn = ((60 - 50) / 50) * 100 = 20%
      expect(result.positions[0].totalReturn).toBe(20);
      expect(result.positions[0].dailyReturn).toBeCloseTo(9.09, 2);
    });

    it('should return empty portfolio when user has no orders', async () => {
      mockOrderRepository.find = jest.fn().mockResolvedValue([]);

      const result = await service.getPortfolio(1);

      expect(result.availableCash).toBe(0);
      expect(result.positions).toHaveLength(0);
      expect(result.totalValue).toBe(0);
    });

    it('should only process FILLED orders', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      // Only FILLED orders should be returned by the repository (filtered by status: OrderStatus.FILLED)
      const orders = [
        createMockOrder(2, 1, instrument, OrderSide.BUY, 5, 60, OrderStatus.FILLED),
      ];

      mockOrderRepository.find = jest.fn().mockResolvedValue(orders);

      const { OrderProcessorFactory } = require('../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => ({
        processCash: jest.fn((cash) => {
          // Add cash first to avoid negative balance
          return cash + 1000 - (order.size! * order.price!);
        }),
        processPositions: jest.fn((positions) => {
          const newPositions = new Map(positions);
          const existing = newPositions.get(1) || { quantity: 0, totalCost: 0, instrument };
          newPositions.set(1, {
            quantity: (existing as any).quantity + order.size!,
            totalCost: (existing as any).totalCost + (order.size! * order.price!),
            instrument,
          });
          return newPositions;
        }),
      }));

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.previousClose = 55;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      const result = await service.getPortfolio(1);

      // Should only process the FILLED order
      expect(result.positions[0].quantity).toBe(5);
      expect(result.positions[0].marketValue).toBe(300); // 5 * 60
    });
  });
});
