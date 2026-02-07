import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { MarketData } from '../entities/MarketData';
import { Instrument } from '../entities/Instrument';
import { OrderStatus } from '../enums/OrderStatus';
import { InstrumentType } from '../enums/InstrumentType';
import { Repository } from 'typeorm';
import { OrderProcessorFactory } from './order-processors/OrderProcessorFactory';

export interface Position {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  marketValue: number;
  totalReturn: number;
}

export interface Portfolio {
  totalValue: number;
  availableCash: number;
  positions: Position[];
  positionsMap: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>;
}

export class PortfolioService {
  private orderRepository: Repository<Order>;
  private marketDataRepository: Repository<MarketData>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.marketDataRepository = AppDataSource.getRepository(MarketData);
  }

  /**
   * Obtiene el portfolio de un usuario: valor total, pesos cash y posiciones
   */
  async getPortfolio(userId: number): Promise<Portfolio> {
    // Obtener todas las órdenes FILLED del usuario
    const filledOrders = await this.orderRepository.find({
      where: {
        userId,
        status: OrderStatus.FILLED,
      },
      relations: ['instrument'],
      order: { datetime: 'ASC' },
    });

    // Calcular pesos cash
    const availableCash = this.calculateAvailableCash(filledOrders);

    // Calcular mapa de posiciones (reutiliza las ordenes ya cargadas)
    const positionsMap = this.buildPositionsMap(filledOrders);

    // Calcular posiciones sin cash (reutiliza el positionsMap ya calculado)
    const positions = await this.calculatePositions(positionsMap);

    // Calcular valor total (cash + valor de mercado de posiciones)
    const totalValue = availableCash + positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    return {
      totalValue,
      availableCash,
      positions,
      positionsMap,
    };
  }


  /**
   * Calcula el cash disponible basado en ordenes FILLED
   */
  private calculateAvailableCash(orders: Order[]): number {
    const cash = orders.reduce((cash, order) => {
      const processor = OrderProcessorFactory.create(order);
      return processor.processCash(cash);
    }, 0);

    // Validar que el cash no sea negativo (estado inconsistente)
    if (cash < 0) {
      throw new Error(
        `Portfolio is in an inconsistent state according to platform rules. ` +
        `Negative cash balance detected (${cash.toFixed(2)}). ` +
        `Please contact customer support to resolve this situation.`
      );
    }

    return cash;
  }

  /**
   * Calcula las posiciones del usuario (excluyendo cash)
   */
  private async calculatePositions(positionsMap: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>): Promise<Position[]> {

    // Validar que no haya posiciones negativas (estado inconsistente)
    const negativePositions = Array.from(positionsMap.entries()).filter(
      ([, position]) => position.quantity < 0
    );

    if (negativePositions.length > 0) {
      const negativeTickers = negativePositions
        .map(([, position]) => position.instrument.ticker || 'Unknown')
        .join(', ');
      throw new Error(
        `Portfolio is in an inconsistent state according to platform rules. ` +
        `Negative positions detected in the following instruments: ${negativeTickers}. ` +
        `Please contact customer support to resolve this situation.`
      );
    }

    // Filtrar posiciones con cantidad > 0
    const validPositions = Array.from(positionsMap.entries()).filter(
      ([, position]) => position.quantity > 0
    );

    // Calcular valores de mercado para cada posición
    const positions = await Promise.all(
      validPositions.map(async ([instrumentId, position]) => {
        // Obtener ultimo precio de mercado
        const latestMarketData = await this.marketDataRepository.findOne({
          where: { instrumentId },
          order: { date: 'DESC' },
        });

        const currentPrice = latestMarketData?.close ? Number(latestMarketData.close) : 0;
        const marketValue = position.quantity * currentPrice;
        const avgCost = position.totalCost / position.quantity;
        const totalReturn = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0;

        return {
          instrumentId,
          ticker: position.instrument.ticker || '',
          name: position.instrument.name || '',
          quantity: position.quantity,
          marketValue,
          totalReturn,
        };
      })
    );

    return positions.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }

  /**
   * Construye el mapa de posiciones a partir de las ordenes ya cargadas
   * Metodo privado para reutilizar la logica sin volver a buscar las ordenes
   */
  private buildPositionsMap(filledOrders: Order[]): Map<number, { quantity: number; totalCost: number; instrument: Instrument }> {
    const validOrders = filledOrders.filter(
      (order) =>
        order.instrument?.ticker !== 'ARS' &&
        order.instrument?.type !== InstrumentType.MONEDA
    );

    let positionsMap = new Map<number, { quantity: number; totalCost: number; instrument: Instrument }>();
    for (const order of validOrders) {
      if (!order.instrument) {
        continue;
      }
      if (!positionsMap.has(order.instrumentId)) {
        positionsMap.set(order.instrumentId, {
          quantity: 0,
          totalCost: 0,
          instrument: order.instrument,
        });
      }
      const processor = OrderProcessorFactory.create(order);
      positionsMap = processor.processPositions(positionsMap);
    }

    return positionsMap;
  }
}
