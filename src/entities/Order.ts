import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Instrument } from './Instrument';
import { OrderSide } from '../enums/OrderSide';
import { OrderType } from '../enums/OrderType';
import { OrderStatus } from '../enums/OrderStatus';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instrumentId', type: 'int', nullable: true })
  instrumentId: number;

  @Column({ name: 'userId', type: 'int', nullable: true })
  userId: number;

  @Column({ name: 'size', type: 'int', nullable: true })
  size: number;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ name: 'type', type: 'varchar', length: 10, nullable: true })
  type: OrderType;

  @Column({ name: 'side', type: 'varchar', length: 10, nullable: true })
  side: OrderSide;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: true })
  status: OrderStatus;

  @Column({ name: 'datetime', type: 'timestamp', nullable: true })
  datetime: Date;

  @ManyToOne(() => Instrument)
  @JoinColumn({ name: 'instrumentId' })
  instrument: Instrument;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;
}
