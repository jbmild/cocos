import { CashInOrderProcessor } from '../CashInOrderProcessor';
import { Order } from '../../../entities/Order';
import { Instrument } from '../../../entities/Instrument';
import { InstrumentType } from '../../../enums/InstrumentType';
import { OrderSide } from '../../../enums/OrderSide';

describe('CashInOrderProcessor', () => {
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
    size: number
  ): Order => {
    const order = new Order();
    order.id = 1;
    order.side = side;
    (order as any).instrument = instrument || undefined;
    (order as any).instrumentId = instrument?.id || undefined;
    order.size = size;
    return order;
  };

  describe('processCash', () => {
    it('should increase cash when processing CASH_IN', () => {
      const instrumentARS = createMockInstrument('ARS', InstrumentType.MONEDA);
      const orderARS = createMockOrder(OrderSide.CASH_IN, instrumentARS, 1000);
      const processorARS = new CashInOrderProcessor(orderARS);
      const resultARS = processorARS.processCash(500);
      expect(resultARS).toBe(1500); // 500 + 1000
    });
  });

  describe('processPositions', () => {
    it('should not modify positions', () => {
      const instrument = createMockInstrument('ARS', InstrumentType.MONEDA);
      const order = createMockOrder(OrderSide.CASH_IN, instrument, 1000);
      const processor = new CashInOrderProcessor(order);

      const positions = new Map();
      positions.set(1, {
        quantity: 10,
        totalCost: 1000,
        instrument: createMockInstrument('AAPL'),
      });

      const result = processor.processPositions(positions);

      expect(result.size).toBe(1);
      expect(result.get(1)?.quantity).toBe(10);
      expect(result.get(1)?.totalCost).toBe(1000);
    });

    it('should return empty map unchanged', () => {
      const instrument = createMockInstrument('ARS', InstrumentType.MONEDA);
      const order = createMockOrder(OrderSide.CASH_IN, instrument, 1000);
      const processor = new CashInOrderProcessor(order);

      const positions = new Map();
      const result = processor.processPositions(positions);

      expect(result.size).toBe(0);
    });
  });
});
