import { SellOrderProcessor } from '../SellOrderProcessor';
import { Order } from '../../../entities/Order';
import { Instrument } from '../../../entities/Instrument';
import { InstrumentType } from '../../../enums/InstrumentType';
import { OrderSide } from '../../../enums/OrderSide';

describe('SellOrderProcessor', () => {
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
    price: number
  ): Order => {
    const order = new Order();
    order.id = 1;
    order.side = side;
    (order as any).instrument = instrument || undefined;
    (order as any).instrumentId = instrument?.id || undefined;
    order.size = size;
    order.price = price;
    return order;
  };

  describe('processCash', () => {
    it('should increase cash when selling non-cash instrument', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.SELL, instrument, 10, 100);
      const processor = new SellOrderProcessor(order);

      const result = processor.processCash(1000);
      expect(result).toBe(2000); // 1000 + (10 * 100) = 2000
    });
  });

  describe('processPositions', () => {
    it('should decrease position quantity when selling', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.SELL, instrument, 5, 100);

      // Setup: create initial position
      const positions = new Map();
      positions.set(1, {
        quantity: 10,
        totalCost: 1000,
        instrument,
      });

      const processor = new SellOrderProcessor(order);
      const result = processor.processPositions(positions);

      const position = result.get(1);
      expect(position?.quantity).toBe(5); // 10 - 5
      expect(position?.totalCost).toBe(500); // (1000/10) * 5 = 500
    });

    it('should handle selling all shares correctly', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.SELL, instrument, 10, 100);

      const positions = new Map();
      positions.set(1, {
        quantity: 10,
        totalCost: 1000,
        instrument,
      });

      const processor = new SellOrderProcessor(order);
      const result = processor.processPositions(positions);

      const position = result.get(1);
      expect(position?.quantity).toBe(0);
      expect(position?.totalCost).toBe(0);
    });

    it('should calculate average cost correctly when selling partial position', () => {
      const instrument = createMockInstrument('AAPL');
      const order = createMockOrder(OrderSide.SELL, instrument, 3, 100);

      // Initial position: 10 shares at $100 each = $1000 total
      const positions = new Map();
      positions.set(1, {
        quantity: 10,
        totalCost: 1000,
        instrument,
      });

      const processor = new SellOrderProcessor(order);
      const result = processor.processPositions(positions);

      const position = result.get(1);
      expect(position?.quantity).toBe(7); // 10 - 3
      // Average cost was $100, so remaining cost = 7 * 100 = 700
      expect(position?.totalCost).toBe(700);
    });
  });
});
