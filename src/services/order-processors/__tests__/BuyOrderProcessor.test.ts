import { BuyOrderProcessor } from '../BuyOrderProcessor';
import { Order } from '../../../entities/Order';
import { Instrument } from '../../../entities/Instrument';
import { InstrumentType } from '../../../enums/InstrumentType';
import { OrderSide } from '../../../enums/OrderSide';

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
      const positions1 = processor1.processPositions(new Map());

      const order2 = createMockOrder(OrderSide.BUY, instrument, 5, 120);
      const processor2 = new BuyOrderProcessor(order2);
      const positions2 = processor2.processPositions(positions1);

      const position = positions2.get(1);
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
      const positions1 = processor1.processPositions(new Map());

      const order2 = createMockOrder(OrderSide.BUY, instrument2, 5, 200);
      const processor2 = new BuyOrderProcessor(order2);
      const positions2 = processor2.processPositions(positions1);

      expect(positions2.size).toBe(2);
      expect(positions2.get(1)?.quantity).toBe(10);
      expect(positions2.get(2)?.quantity).toBe(5);
    });
  });
});
