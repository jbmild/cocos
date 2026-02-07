import { BuyOrderProcessor } from '../BuyOrderProcessor';
import { Order } from '../../../entities/Order';
import { Instrument } from '../../../entities/Instrument';
import { InstrumentType } from '../../../enums/InstrumentType';
import { OrderSide } from '../../../enums/OrderSide';
import { OrderType } from '../../../enums/OrderType';
import { OrderStatus } from '../../../enums/OrderStatus';

describe('BuyOrderProcessor', () => {
  const createMockInstrument = (ticker: string, type: InstrumentType = InstrumentType.ACCIONES): Instrument => {
    const instrument = new Instrument();
    instrument.id = 1;
    instrument.ticker = ticker;
    instrument.name = 'Test Instrument';
    instrument.type = type;
    return instrument;
  };

  const createMockOrder = (
    side: OrderSide,
    instrument: Instrument | null,
    size: number,
    price: number,
    type: OrderType = OrderType.MARKET
  ): Order => {
    const order = new Order();
    order.id = 1;
    order.side = side;
    order.type = type;
    (order as any).instrument = instrument || undefined;
    (order as any).instrumentId = instrument?.id || undefined;
    order.size = size;
    order.price = price;
    return order;
  };

  describe('processCash', () => {
    it('should decrease cash when buying non-cash instrument', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.BUY, instrument, 10, 100);
      const processor = new BuyOrderProcessor(order);

      const result = processor.processCash(1000);
      expect(result).toBe(0); // 1000 - (10 * 100) = 0
    });
  });

  describe('processPositions', () => {
    it('should add new position when buying', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.BUY, instrument, 10, 100);
      const processor = new BuyOrderProcessor(order);

      const positions = new Map();
      positions.set(1, {
        quantity: 0,
        totalCost: 0,
        instrument,
      });
      const result = processor.processPositions(positions);

      expect(result.has(1)).toBe(true);
      const position = result.get(1);
      expect(position?.quantity).toBe(10);
      expect(position?.totalCost).toBe(1000);
      expect(position?.instrument).toBe(instrument);
    });

    it('should increase existing position when buying more', () => {
      const instrument = createMockInstrument('AAPL');
      const order1 = createMockOrder(OrderSide.BUY, instrument, 10, 100);
      const processor1 = new BuyOrderProcessor(order1);
      const positions1 = new Map();
      positions1.set(1, {
        quantity: 0,
        totalCost: 0,
        instrument,
      });
      processor1.processPositions(positions1);

      const order2 = createMockOrder(OrderSide.BUY, instrument, 5, 120);
      const processor2 = new BuyOrderProcessor(order2);
      processor2.processPositions(positions1);

      const position = positions1.get(1);
      expect(position?.quantity).toBe(15); // 10 + 5
      expect(position?.totalCost).toBe(1600); // 1000 + 600
    });

    it('should handle multiple instruments correctly', () => {
      const instrument1 = createMockInstrument('AAPL');
      instrument1.id = 1;
      const instrument2 = createMockInstrument('GOOGL');
      instrument2.id = 2;

      const order1 = createMockOrder(OrderSide.BUY, instrument1, 10, 100);
      const processor1 = new BuyOrderProcessor(order1);
      const positions1 = new Map();
      positions1.set(1, {
        quantity: 0,
        totalCost: 0,
        instrument: instrument1,
      });
      processor1.processPositions(positions1);

      const order2 = createMockOrder(OrderSide.BUY, instrument2, 5, 200);
      const processor2 = new BuyOrderProcessor(order2);
      positions1.set(2, {
        quantity: 0,
        totalCost: 0,
        instrument: instrument2,
      });
      processor2.processPositions(positions1);

      expect(positions1.size).toBe(2);
      expect(positions1.get(1)?.quantity).toBe(10);
      expect(positions1.get(2)?.quantity).toBe(5);
    });
  });

  describe('validateOrder', () => {
    it('should return false when instrument is null', () => {
      const order = createMockOrder(OrderSide.BUY, null, 10, 100);
      const processor = new BuyOrderProcessor(order);
      const positions = new Map();

      const result = processor.validateOrder(1000, positions);
      expect(result).toBe(false);
    });

    it('should return false when trying to buy cash instrument', () => {
      const instrument = createMockInstrument('ARS', InstrumentType.MONEDA);
      const order = createMockOrder(OrderSide.BUY, instrument, 1000, 1);
      const processor = new BuyOrderProcessor(order);
      const positions = new Map();

      const result = processor.validateOrder(1000, positions);
      expect(result).toBe(false);
    });

    it('should return false when insufficient cash', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.BUY, instrument, 10, 100);
      const processor = new BuyOrderProcessor(order);
      const positions = new Map();

      const result = processor.validateOrder(500, positions); // Only 500, need 1000
      expect(result).toBe(false);
    });

    it('should return true when sufficient cash', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.BUY, instrument, 10, 100);
      const processor = new BuyOrderProcessor(order);
      const positions = new Map();

      const result = processor.validateOrder(1000, positions);
      expect(result).toBe(true);
    });

    it('should return true when cash exactly matches order value', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.BUY, instrument, 10, 100);
      const processor = new BuyOrderProcessor(order);
      const positions = new Map();

      const result = processor.validateOrder(1000, positions); // Exactly 1000
      expect(result).toBe(true);
    });
  });

  describe('determineStatus', () => {
    it('should return FILLED for valid MARKET order', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.BUY, instrument, 10, 100, OrderType.MARKET);
      const processor = new BuyOrderProcessor(order);

      const result = processor.determineStatus(true);
      expect(result).toBe(OrderStatus.FILLED);
    });

    it('should return NEW for valid LIMIT order', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.BUY, instrument, 10, 100, OrderType.LIMIT);
      const processor = new BuyOrderProcessor(order);

      const result = processor.determineStatus(true);
      expect(result).toBe(OrderStatus.NEW);
    });

    it('should return REJECTED for invalid order', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.BUY, instrument, 10, 100);
      const processor = new BuyOrderProcessor(order);

      const result = processor.determineStatus(false);
      expect(result).toBe(OrderStatus.REJECTED);
    });
  });
});
