import { AppDataSource } from '../../config/database';
import { Order } from '../../entities/Order';
import { MarketData } from '../../entities/MarketData';
import { Instrument } from '../../entities/Instrument';
import { PortfolioSnapshot } from '../../entities/PortfolioSnapshot';
import { OrderStatus } from '../../enums/OrderStatus';
import { Repository, LessThan, MoreThan, MoreThanOrEqual, In } from 'typeorm';
import { OrderProcessorFactory } from '../order-processors/OrderProcessorFactory';
import { Portfolio } from '../PortfolioService';
import { calculateAvailableCash, calculatePositions, buildPositionsMap } from './portfolioUtils';

/**
 * PortfolioService V2 - Lógica optimizada con snapshots
 * Usa snapshots diarios para optimizar el cálculo del portfolio
 */
export class PortfolioServiceV2 {
  private orderRepository: Repository<Order>;
  private marketDataRepository: Repository<MarketData>;
  private portfolioSnapshotRepository: Repository<PortfolioSnapshot>;
  private instrumentRepository: Repository<Instrument>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.marketDataRepository = AppDataSource.getRepository(MarketData);
    this.portfolioSnapshotRepository = AppDataSource.getRepository(PortfolioSnapshot);
    this.instrumentRepository = AppDataSource.getRepository(Instrument);
  }

  /**
   * Obtiene el portfolio usando snapshots (optimizado)
   */
  async getPortfolio(userId: number): Promise<Portfolio> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Obtener el último snapshot (día anterior o anterior)
    const lastSnapshot = await this.portfolioSnapshotRepository.findOne({
      where: {
        userId,
        snapshotDate: LessThan(today),
      },
      order: { snapshotDate: 'DESC' },
    });

    // Obtener órdenes del día actual
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayOrders = await this.orderRepository.find({
      where: {
        userId,
        status: OrderStatus.FILLED,
        datetime: MoreThanOrEqual(todayStart),
      },
      relations: ['instrument'],
      order: { datetime: 'ASC' },
    });

    let availableCash: number;
    let positionsMap: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>;
    let ordersUntilYesterday: Order[] = []; // Para verificar si hubo cambios

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    if (lastSnapshot) {
      // Hay un snapshot previo, partir de ese snapshot y aplicar órdenes desde el día siguiente hasta el día anterior
      const snapshotDate = new Date(lastSnapshot.snapshotDate);
      snapshotDate.setHours(0, 0, 0, 0);
      
      // El final del día del snapshot (para excluir todas las órdenes del día del snapshot)
      const snapshotDateEnd = new Date(snapshotDate);
      snapshotDateEnd.setHours(23, 59, 59, 999);
      
      const ordersFromSnapshot = await this.orderRepository.find({
        where: {
          userId,
          status: OrderStatus.FILLED,
          datetime: MoreThan(snapshotDateEnd), // Después del final del día del snapshot
        },
        relations: ['instrument'],
        order: { datetime: 'ASC' },
      });

      // Filtrar órdenes hasta el día anterior
      ordersUntilYesterday = (ordersFromSnapshot || []).filter(
        order => order.datetime <= yesterdayEnd
      );

      // Partir del snapshot previo
      availableCash = Number(lastSnapshot.availableCash);
      positionsMap = await this.deserializePositionsMap(lastSnapshot.positionsMap);

      // Aplicar órdenes desde el día siguiente al snapshot hasta el día anterior
      for (const order of ordersUntilYesterday) {
        if (order.instrument) {
          const processor = OrderProcessorFactory.create(order);
          availableCash = processor.processCash(availableCash);
          positionsMap = processor.processPositions(positionsMap);
        }
      }
    } else {
      // No hay ningún snapshot, calcular desde el inicio hasta el día anterior
      const allOrdersUntilYesterday = await this.orderRepository.find({
        where: {
          userId,
          status: OrderStatus.FILLED,
          datetime: LessThan(todayStart),
        },
        relations: ['instrument'],
        order: { datetime: 'ASC' },
      });

      ordersUntilYesterday = allOrdersUntilYesterday;
      availableCash = calculateAvailableCash(allOrdersUntilYesterday);
      positionsMap = buildPositionsMap(allOrdersUntilYesterday);
    }

    // Guardar valores del día anterior antes de aplicar órdenes del día actual (para el snapshot)
    const yesterdayCash = availableCash;
    const yesterdayPositionsMap = new Map(positionsMap);

    // Aplicar órdenes del día actual
    for (const order of todayOrders) {
      if (order.instrument) {
        const processor = OrderProcessorFactory.create(order);
        availableCash = processor.processCash(availableCash);
        positionsMap = processor.processPositions(positionsMap);
      }
    }

    // Calcular posiciones sin cash
    const positions = await calculatePositions(positionsMap, this.marketDataRepository);

    // Calcular valor total
    const totalValue = availableCash + positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    const existingYesterdaySnapshot = await this.portfolioSnapshotRepository.findOne({
      where: {
        userId,
        snapshotDate: yesterday,
      },
    });

    const shouldSaveSnapshot = !existingYesterdaySnapshot && (
      !lastSnapshot || // No hay snapshot previo (primera vez)
      ordersUntilYesterday.length > 0 // Hubo órdenes desde el último snapshot
    );

    if (shouldSaveSnapshot) {
      await this.saveSnapshot(userId, yesterday, yesterdayCash, yesterdayPositionsMap);
    }

    return {
      totalValue,
      availableCash,
      positions,
      positionsMap,
    };
  }


  /**
   * Guarda un snapshot del portfolio
   */
  private async saveSnapshot(
    userId: number,
    date: Date,
    availableCash: number,
    positionsMap: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>
  ): Promise<void> {
    // Normalizar la fecha a medianoche para evitar problemas de zona horaria
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const snapshot = new PortfolioSnapshot();
    snapshot.userId = userId;
    snapshot.snapshotDate = normalizedDate;
    snapshot.availableCash = availableCash;
    snapshot.positionsMap = this.serializePositionsMap(positionsMap);
    await this.portfolioSnapshotRepository.save(snapshot);
  }

  /**
   * Serializa el positionsMap a JSON string para almacenar en la base de datos
   */
  private serializePositionsMap(
    positionsMap: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>
  ): string {
    const serialized: Record<string, { quantity: number; totalCost: number; instrumentId: number }> = {};
    
    for (const [instrumentId, position] of positionsMap.entries()) {
      serialized[instrumentId.toString()] = {
        quantity: position.quantity,
        totalCost: position.totalCost,
        instrumentId: position.instrument.id,
      };
    }

    return JSON.stringify(serialized);
  }

  /**
   * Deserializa el JSON string a positionsMap
   */
  private async deserializePositionsMap(
    serialized: string
  ): Promise<Map<number, { quantity: number; totalCost: number; instrument: Instrument }>> {
    const positionsMap = new Map<number, { quantity: number; totalCost: number; instrument: Instrument }>();
    const data = JSON.parse(serialized);

    // Cargar todos los instrumentos necesarios
    const instrumentIds = Object.keys(data).map(id => parseInt(id, 10));
    if (instrumentIds.length === 0) {
      return positionsMap;
    }

    const instruments = await this.instrumentRepository.find({
      where: { id: In(instrumentIds) },
    });

    const instrumentsMap = new Map(instruments.map(inst => [inst.id, inst]));

    for (const [instrumentIdStr, positionData] of Object.entries(data)) {
      const instrumentId = parseInt(instrumentIdStr, 10);
      const instrument = instrumentsMap.get(instrumentId);
      
      if (instrument) {
        positionsMap.set(instrumentId, {
          quantity: (positionData as any).quantity,
          totalCost: (positionData as any).totalCost,
          instrument,
        });
      }
    }

    return positionsMap;
  }
}
