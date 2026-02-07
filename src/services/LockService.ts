import { AppDataSource } from '../config/database';
import { QueryRunner } from 'typeorm';

export class LockService {
  /**
   * Adquiere un advisory lock bloqueante para un usuario. El lock se libera automaticamente cuando la conexion/transaccion termina
   * queryRunner: Query runner de la transaccion activa
   * userId: ID del usuario
   */
  static async acquireUserLock(queryRunner: QueryRunner, userId: number): Promise<void> {
    // pg_advisory_lock bloquea hasta que se pueda adquirir el lock
    // Se libera automaticamente cuando la transaccion termina o la conexion se cierra
    await queryRunner.query('SELECT pg_advisory_lock($1)', [userId]);
  }

  /**
   * Intenta adquirir un advisory lock sin bloquear
   *  queryRunner: Query runner de la transaccion activa
   *  userId: ID del usuario
   */
  static async tryAcquireUserLock(queryRunner: QueryRunner, userId: number): Promise<boolean> {
    const result = await queryRunner.query('SELECT pg_try_advisory_lock($1) as acquired', [userId]);
    return result[0]?.acquired === true;
  }

  /**
   * Libera un advisory lock para un usuario. Normalmente no es necesario llamar esto manualmente ya que los locks se liberan automaticamente al finalizar la transaccion
   *  queryRunner: Query runner de la transaccion activa
   *  userId: ID del usuario
   */
  static async releaseUserLock(queryRunner: QueryRunner, userId: number): Promise<void> {
    await queryRunner.query('SELECT pg_advisory_unlock($1)', [userId]);
  }
}
