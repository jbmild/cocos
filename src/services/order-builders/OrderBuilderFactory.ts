import { OrderBuilder } from './OrderBuilder';
import { MarketOrderBuilder } from './MarketOrderBuilder';
import { LimitOrderBuilder } from './LimitOrderBuilder';
import { OrderType } from '../../enums/OrderType';
import { ValidationError } from '../../errors/ValidationError';

export class OrderBuilderFactory {
  static create(type: OrderType): OrderBuilder {
    switch (type) {
      case OrderType.MARKET:
        return new MarketOrderBuilder();
      case OrderType.LIMIT:
        return new LimitOrderBuilder();
      default:
        throw new ValidationError(`Unknown order type: ${type}`);
    }
  }
}
