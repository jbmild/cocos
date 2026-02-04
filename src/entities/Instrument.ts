import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { InstrumentType } from '../enums/InstrumentType';

@Entity('instruments')
@Index(['ticker'])
@Index(['name'])
export class Instrument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  ticker: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    enum: InstrumentType,
  })
  type: InstrumentType;
}
