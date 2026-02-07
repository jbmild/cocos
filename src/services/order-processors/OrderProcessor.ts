import { Instrument } from '../../entities/Instrument';
import { OrderStatus } from '../../enums/OrderStatus';

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

  /**
   * Valida si la orden puede ser ejecutada basandose en el portfolio actual
   *  availableCash: Cash disponible del usuario
   *  positions: Mapa de posiciones actuales del usuario
   */
  validateOrder(
    availableCash: number,
    positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>
  ): boolean;

  /**
   * Determina el estado final de la orden basado en si es valida y el tipo de orden
   *  isValid: Si la orden paso la validacion
   */
  determineStatus(isValid: boolean): OrderStatus;
}
