import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('portfolio_snapshots')
@Index(['userId', 'snapshotDate'], { unique: true })
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userid', type: 'int' })
  userId: number;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @Column({ name: 'available_cash', type: 'decimal', precision: 18, scale: 2 })
  availableCash: number;

  @Column({ name: 'positions_map', type: 'jsonb' })
  positionsMap: string; // JSON string of positions
}
