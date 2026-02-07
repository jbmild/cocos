import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderType } from '../enums/OrderType';
import { OrderSide } from '../enums/OrderSide';
import { Repository, QueryRunner } from 'typeorm';
import { OrderProcessorFactory } from './order-processors/OrderProcessorFactory';
import { PortfolioService } from './PortfolioService';
import { OrderBuilderFactory } from './order-builders/OrderBuilderFactory';
import { InstrumentService } from './InstrumentService';
import { MarketDataService } from './MarketDataService';
import { LockService } from './LockService';

export interface CreateOrderInput {
  userId: number;
  instrumentId: number;
  side: string;
  type: OrderType;
  size?: number;
  amount?: number;
  price?: number;
}

export class OrderService {
  private orderRepository: Repository<Order>;
  private portfolioService: PortfolioService;
  private instrumentService: InstrumentService;
  private marketDataService: MarketDataService;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.portfolioService = new PortfolioService();
    this.instrumentService = new InstrumentService();
    this.marketDataService = new MarketDataService();
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    // Usar una transaccion para garantizar atomicidad y consistencia
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Adquirir lock para el usuario (bloquea hasta que se pueda adquirir). Esto garantiza que solo una orden por usuario se procese a la vez. El lock se libera automaticamente cuando la transaccion termina
      await LockService.acquireUserLock(queryRunner, input.userId);

      // Obtener datos necesarios de la base de datos
      const instrument = await this.instrumentService.getInstrument(input.instrumentId, queryRunner);

      let marketPrice: number | undefined;
      if (input.type === OrderType.MARKET) {
        if (input.side === OrderSide.CASH_IN || input.side === OrderSide.CASH_OUT) {
          marketPrice = 1;
        } else {
          marketPrice = await this.marketDataService.getMarketPrice(input.instrumentId, queryRunner);
        }
      }

      // Obtener portfolio del usuario
      const portfolio = await this.portfolioService.getPortfolio(input.userId);

      // El builder valida y construye la orden
      const builder = OrderBuilderFactory.create(input.type);
      builder.validateInput(input);
      const { order } = builder.buildOrder(
        input,
        instrument,
        marketPrice
      );

      // El processor valida la orden y determina su estado
      const processor = OrderProcessorFactory.create(order);
      const isValid = processor.validateOrder(
        portfolio.availableCash,
        portfolio.positionsMap
      );
      order.status = processor.determineStatus(isValid);

      // Persistir la orden en la base de datos
      const savedOrder = await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

}
