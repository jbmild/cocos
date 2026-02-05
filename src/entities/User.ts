import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './Order';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'accountnumber', type: 'varchar', length: 20, nullable: true })
  accountNumber: string;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
