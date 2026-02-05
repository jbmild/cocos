import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Instrument } from './Instrument';

@Entity('marketdata')
export class MarketData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instrumentid', type: 'int', nullable: true })
  instrumentId: number;

  @Column({ name: 'high', type: 'decimal', precision: 10, scale: 2, nullable: true })
  high: number;

  @Column({ name: 'low', type: 'decimal', precision: 10, scale: 2, nullable: true })
  low: number;

  @Column({ name: 'open', type: 'decimal', precision: 10, scale: 2, nullable: true })
  open: number;

  @Column({ name: 'close', type: 'decimal', precision: 10, scale: 2, nullable: true })
  close: number;

  @Column({ name: 'previousclose', type: 'decimal', precision: 10, scale: 2, nullable: true })
  previousClose: number;

  @Column({ name: 'date', type: 'date', nullable: true })
  date: Date;

  @ManyToOne(() => Instrument)
  @JoinColumn({ name: 'instrumentid' })
  instrument: Instrument;
}
