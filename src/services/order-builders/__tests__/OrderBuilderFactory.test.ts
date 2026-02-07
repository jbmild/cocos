import { OrderBuilderFactory } from '../OrderBuilderFactory';
import { MarketOrderBuilder } from '../MarketOrderBuilder';
import { LimitOrderBuilder } from '../LimitOrderBuilder';
import { OrderType } from '../../../enums/OrderType';
import { ValidationError } from '../../../errors/ValidationError';

describe('OrderBuilderFactory', () => {
  describe('create', () => {
    it('should create MarketOrderBuilder for MARKET type', () => {
      const builder = OrderBuilderFactory.create(OrderType.MARKET);
      expect(builder).toBeInstanceOf(MarketOrderBuilder);
    });

    it('should create LimitOrderBuilder for LIMIT type', () => {
      const builder = OrderBuilderFactory.create(OrderType.LIMIT);
      expect(builder).toBeInstanceOf(LimitOrderBuilder);
    });

    it('should throw ValidationError for unknown order type', () => {
      expect(() => OrderBuilderFactory.create('UNKNOWN' as OrderType)).toThrow(ValidationError);
      expect(() => OrderBuilderFactory.create('UNKNOWN' as OrderType)).toThrow('Unknown order type: UNKNOWN');
    });

    it('should create different instances for each call', () => {
      const builder1 = OrderBuilderFactory.create(OrderType.MARKET);
      const builder2 = OrderBuilderFactory.create(OrderType.MARKET);
      
      expect(builder1).toBeInstanceOf(MarketOrderBuilder);
      expect(builder2).toBeInstanceOf(MarketOrderBuilder);
      expect(builder1).not.toBe(builder2); // Different instances
    });
  });
});
