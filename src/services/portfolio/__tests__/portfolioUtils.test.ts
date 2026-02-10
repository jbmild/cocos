import { calculateAvailableCash, calculatePositions, buildPositionsMap } from '../portfolioUtils';
import { Order } from '../../../entities/Order';
import { MarketData } from '../../../entities/MarketData';
import { Instrument } from '../../../entities/Instrument';
import { OrderStatus } from '../../../enums/OrderStatus';
import { OrderSide } from '../../../enums/OrderSide';
import { InstrumentType } from '../../../enums/InstrumentType';
import { Repository } from 'typeorm';
import { OrderProcessorFactory } from '../../order-processors/OrderProcessorFactory';

jest.mock('../../order-processors/OrderProcessorFactory');

describe('portfolioUtils', () => {
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

  describe('calculateAvailableCash', () => {
    it('should calculate cash correctly from orders', () => {
      const instrument = createMockInstrument(66, 'ARS', InstrumentType.MONEDA);
      const orders = [
        createMockOrder(1, 1, instrument, OrderSide.CASH_IN, 1000, 1),
        createMockOrder(2, 1, instrument, OrderSide.CASH_OUT, 200, 1),
      ];

      const { OrderProcessorFactory } = require('../../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => ({
        processCash: jest.fn((cash) => {
          if (order.side === OrderSide.CASH_IN) return cash + 1000;
          if (order.side === OrderSide.CASH_OUT) return cash - 200;
          return cash;
        }),
      }));

      const result = calculateAvailableCash(orders);

      expect(result).toBe(800); // 1000 - 200
    });

    it('should throw error when cash is negative', () => {
      const instrument = createMockInstrument(66, 'ARS', InstrumentType.MONEDA);
      const orders = [
        createMockOrder(1, 1, instrument, OrderSide.CASH_OUT, 1000, 1),
      ];

      const { OrderProcessorFactory } = require('../../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => ({
        processCash: jest.fn((cash) => cash - 1000),
      }));

      expect(() => calculateAvailableCash(orders)).toThrow('inconsistent state');
      expect(() => calculateAvailableCash(orders)).toThrow('Negative cash balance');
    });

    it('should return 0 for empty orders', () => {
      const result = calculateAvailableCash([]);
      expect(result).toBe(0);
    });
  });

  describe('buildPositionsMap', () => {
    it('should build positions map from orders', () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const orders = [
        createMockOrder(1, 1, instrument, OrderSide.BUY, 10, 50),
        createMockOrder(2, 1, instrument, OrderSide.BUY, 5, 60),
      ];

      const { OrderProcessorFactory } = require('../../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => ({
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

      const result = buildPositionsMap(orders);

      expect(result.size).toBe(1);
      expect(result.get(1)?.quantity).toBe(15); // 10 + 5
      expect(result.get(1)?.totalCost).toBe(800); // (10 * 50) + (5 * 60)
    });

    it('should exclude cash instruments from positions', () => {
      const cashInstrument = createMockInstrument(66, 'ARS', InstrumentType.MONEDA);
      const orders = [
        createMockOrder(1, 1, cashInstrument, OrderSide.CASH_IN, 1000, 1),
      ];

      const result = buildPositionsMap(orders);

      expect(result.size).toBe(0);
    });

    it('should handle multiple instruments', () => {
      const instrument1 = createMockInstrument(1, 'AAPL');
      const instrument2 = createMockInstrument(2, 'GOOGL');
      const orders = [
        createMockOrder(1, 1, instrument1, OrderSide.BUY, 10, 50),
        createMockOrder(2, 1, instrument2, OrderSide.BUY, 5, 100),
      ];

      const { OrderProcessorFactory } = require('../../order-processors/OrderProcessorFactory');
      OrderProcessorFactory.create = jest.fn((order) => ({
        processPositions: jest.fn((positions) => {
          const newPositions = new Map(positions);
          const instrumentId = order.instrumentId;
          const existing = newPositions.get(instrumentId) || { quantity: 0, totalCost: 0, instrument: order.instrument };
          newPositions.set(instrumentId, {
            quantity: (existing as any).quantity + order.size!,
            totalCost: (existing as any).totalCost + (order.size! * order.price!),
            instrument: order.instrument,
          });
          return newPositions;
        }),
      }));

      const result = buildPositionsMap(orders);

      expect(result.size).toBe(2);
      expect(result.get(1)?.quantity).toBe(10);
      expect(result.get(2)?.quantity).toBe(5);
    });

    it('should skip orders without instrument', () => {
      const orders = [
        createMockOrder(1, 1, null, OrderSide.BUY, 10, 50),
      ];

      const result = buildPositionsMap(orders);

      expect(result.size).toBe(0);
    });
  });

  describe('calculatePositions', () => {
    let mockMarketDataRepository: jest.Mocked<Repository<MarketData>>;

    beforeEach(() => {
      mockMarketDataRepository = {
        findOne: jest.fn(),
      } as any;
    });

    it('should calculate positions correctly', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const positionsMap = new Map([
        [1, {
          quantity: 10,
          totalCost: 500, // avg cost = 50
          instrument,
        }],
      ]);

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60; // current price = 60
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      const result = await calculatePositions(positionsMap, mockMarketDataRepository);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(10);
      expect(result[0].marketValue).toBe(600); // 10 * 60
      expect(result[0].totalReturn).toBe(20); // ((60 - 50) / 50) * 100
    });

    it('should throw error when positions are negative', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const positionsMap = new Map([
        [1, {
          quantity: -10,
          totalCost: -500,
          instrument,
        }],
      ]);

      await expect(calculatePositions(positionsMap, mockMarketDataRepository)).rejects.toThrow('inconsistent state');
      await expect(calculatePositions(positionsMap, mockMarketDataRepository)).rejects.toThrow('Negative positions');
    });

    it('should filter out positions with zero quantity', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const positionsMap = new Map([
        [1, {
          quantity: 0,
          totalCost: 0,
          instrument,
        }],
      ]);

      const result = await calculatePositions(positionsMap, mockMarketDataRepository);

      expect(result).toHaveLength(0);
    });

    it('should handle missing market data', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const positionsMap = new Map([
        [1, {
          quantity: 10,
          totalCost: 500,
          instrument,
        }],
      ]);

      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(null);

      const result = await calculatePositions(positionsMap, mockMarketDataRepository);

      expect(result).toHaveLength(1);
      expect(result[0].marketValue).toBe(0); // No market data, price = 0
      // When avgCost > 0 and currentPrice = 0, totalReturn = ((0 - 50) / 50) * 100 = -100
      expect(result[0].totalReturn).toBe(-100);
    });

    it('should sort positions by ticker', async () => {
      const instrument1 = createMockInstrument(1, 'GOOGL');
      const instrument2 = createMockInstrument(2, 'AAPL');
      const positionsMap = new Map([
        [1, {
          quantity: 10,
          totalCost: 500,
          instrument: instrument1,
        }],
        [2, {
          quantity: 5,
          totalCost: 250,
          instrument: instrument2,
        }],
      ]);

      const marketData = new MarketData();
      marketData.close = 50;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      const result = await calculatePositions(positionsMap, mockMarketDataRepository);

      expect(result).toHaveLength(2);
      expect(result[0].ticker).toBe('AAPL'); // Sorted alphabetically
      expect(result[1].ticker).toBe('GOOGL');
    });

    it('should calculate total return correctly for zero avg cost', async () => {
      const instrument = createMockInstrument(1, 'AAPL');
      const positionsMap = new Map([
        [1, {
          quantity: 10,
          totalCost: 0, // avg cost = 0
          instrument,
        }],
      ]);

      const marketData = new MarketData();
      marketData.id = 1;
      marketData.instrumentId = 1;
      marketData.close = 60;
      marketData.date = new Date();
      mockMarketDataRepository.findOne = jest.fn().mockResolvedValue(marketData);

      const result = await calculatePositions(positionsMap, mockMarketDataRepository);

      expect(result[0].totalReturn).toBe(0); // Should be 0 when avg cost is 0
    });
  });
});
