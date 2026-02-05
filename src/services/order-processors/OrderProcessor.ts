import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';

export interface OrderProcessor {
  /**
   * Procesa el impacto de la orden en el cash disponible
   */
  processCash(cash: number): number;

  /**
   * Procesa el impacto de la orden en el mapa de posiciones
   * Recibe el mapa completo y retorna el mapa modificado
   */
  processPositions(
    positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>
  ): Map<number, { quantity: number; totalCost: number; instrument: Instrument }>;
}
