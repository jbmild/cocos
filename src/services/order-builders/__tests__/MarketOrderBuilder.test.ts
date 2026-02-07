import { MarketOrderBuilder } from '../MarketOrderBuilder';
import { CreateOrderInput } from '../../OrderService';
import { Order } from '../../../entities/Order';
import { Instrument } from '../../../entities/Instrument';
import { OrderType } from '../../../enums/OrderType';
import { OrderSide } from '../../../enums/OrderSide';
import { InstrumentType } from '../../../enums/InstrumentType';
import { ValidationError } from '../../../errors/ValidationError';

describe('MarketOrderBuilder', () => {
  let builder: MarketOrderBuilder;
  let mockInstrument: Instrument;

  beforeEach(() => {
    builder = new MarketOrderBuilder();
    mockInstrument = new Instrument();
    mockInstrument.id = 47;
    mockInstrument.ticker = 'MOLI';
    mockInstrument.name = 'Molinos Río de la Plata';
    mockInstrument.type = InstrumentType.ACCIONES;
  });

  describe('validateInput', () => {
    it('should not throw when size is provided', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      expect(() => builder.validateInput(input)).not.toThrow();
    });

    it('should not throw when amount is provided for MARKET order', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        amount: 10000,
      };

      expect(() => builder.validateInput(input)).not.toThrow();
    });

    it('should throw ValidationError when amount is used with non-MARKET order', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        amount: 10000,
        price: 900,
      };

      expect(() => builder.validateInput(input)).toThrow(ValidationError);
      expect(() => builder.validateInput(input)).toThrow('Amount can only be used with MARKET orders');
    });

    it('should throw ValidationError when neither size nor amount is provided', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
      };

      expect(() => builder.validateInput(input)).toThrow(ValidationError);
      expect(() => builder.validateInput(input)).toThrow('Either size or amount must be provided');
    });
  });

  describe('buildOrder', () => {
    it('should build order with size or calculate size from amount', () => {
      // Test with size
      const inputWithSize: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      const resultWithSize = builder.buildOrder(inputWithSize, mockInstrument, 925.85);

      expect(resultWithSize.order.userId).toBe(3);
      expect(resultWithSize.order.instrumentId).toBe(47);
      expect(resultWithSize.order.side).toBe(OrderSide.BUY);
      expect(resultWithSize.order.type).toBe(OrderType.MARKET);
      expect(resultWithSize.order.size).toBe(10);
      expect(resultWithSize.order.price).toBe(925.85);
      expect(resultWithSize.order.instrument).toEqual(mockInstrument);
      expect(resultWithSize.order.datetime).toBeInstanceOf(Date);
      expect(resultWithSize.marketPrice).toBe(925.85);
    });

    it('should throw ValidationError when amount is too small', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        amount: 10,
      };

      expect(() => builder.buildOrder(input, mockInstrument, 925.85)).toThrow(ValidationError);
      expect(() => builder.buildOrder(input, mockInstrument, 925.85)).toThrow('Amount is too small to buy at least one share');
    });

    it('should throw ValidationError when marketPrice is not provided for non-cash operation', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      expect(() => builder.buildOrder(input, mockInstrument)).toThrow(ValidationError);
      expect(() => builder.buildOrder(input, mockInstrument)).toThrow('Market price is required for MARKET orders');
    });

    it('should handle CASH_IN operations correctly with size or amount', () => {
      const cashInstrument = new Instrument();
      cashInstrument.id = 66;
      cashInstrument.ticker = 'ARS';
      cashInstrument.name = 'PESOS';
      cashInstrument.type = InstrumentType.MONEDA;

      // Test with size
      const inputWithSize: CreateOrderInput = {
        userId: 3,
        instrumentId: 66,
        side: OrderSide.CASH_IN,
        type: OrderType.MARKET,
        size: 1000000,
      };

      const resultWithSize = builder.buildOrder(inputWithSize, cashInstrument);
      expect(resultWithSize.order.price).toBe(1);
      expect(resultWithSize.marketPrice).toBe(1);
      expect(resultWithSize.order.size).toBe(1000000);
    });

    it('should set price to 1 for CASH_OUT operations', () => {
      const cashInstrument = new Instrument();
      cashInstrument.id = 66;
      cashInstrument.ticker = 'ARS';
      cashInstrument.name = 'PESOS';
      cashInstrument.type = InstrumentType.MONEDA;

      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 66,
        side: OrderSide.CASH_OUT,
        type: OrderType.MARKET,
        size: 50000,
      };

      const result = builder.buildOrder(input, cashInstrument);

      expect(result.order.price).toBe(1);
      expect(result.marketPrice).toBe(1);
    });

    it('should handle amount calculation with decimal result correctly', () => {
      const input: CreateOrderInput = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        amount: 1000,
      };

      const result = builder.buildOrder(input, mockInstrument, 925.85);

      // floor(1000 / 925.85) = 1
      expect(result.order.size).toBe(1);
    });
  });
});
