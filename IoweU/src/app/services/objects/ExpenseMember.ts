import { Products } from './Products';
export interface ExpenseMember {
  memberId: string;
  amountToPay: number;
  foreignAmountToPay?: number;
  split?: number;
  products?: Products[];
  paid: boolean;
}
