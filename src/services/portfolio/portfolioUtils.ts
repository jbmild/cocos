import { Order } from '../../entities/Order';
import { MarketData } from '../../entities/MarketData';
import { Instrument } from '../../entities/Instrument';
import { InstrumentType } from '../../enums/InstrumentType';
import { Repository } from 'typeorm';
import { OrderProcessorFactory } from '../order-processors/OrderProcessorFactory';
import { Position } from '../PortfolioService';

/**
 * Calcula el cash disponible basado en ordenes FILLED
 */
export function calculateAvailableCash(orders: Order[]): number {
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
export async function calculatePositions(
  positionsMap: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>,
  marketDataRepository: Repository<MarketData>
): Promise<Position[]> {
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
      const latestMarketData = await marketDataRepository.findOne({
        where: { instrumentId },
        order: { date: 'DESC' },
      });

      const currentPrice = latestMarketData?.close ? Number(latestMarketData.close) : 0;
      const previousPrice = latestMarketData?.previousClose ? Number(latestMarketData.previousClose) : 0;
      const marketValue = position.quantity * currentPrice;
      const avgCost = position.totalCost / position.quantity;
      const totalReturn = avgCost > 0 ? Number((((currentPrice - avgCost) / avgCost) * 100).toFixed(2)) : 0;
      const dailyReturn = previousPrice > 0 ? Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2)) : 0;

      return {
        instrumentId,
        ticker: position.instrument.ticker || '',
        name: position.instrument.name || '',
        quantity: position.quantity,
        marketValue,
        totalReturn,
        dailyReturn,
      };
    })
  );

  return positions.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/**
 * Construye el mapa de posiciones a partir de las ordenes ya cargadas
 */
export function buildPositionsMap(
  filledOrders: Order[]
): Map<number, { quantity: number; totalCost: number; instrument: Instrument }> {
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
