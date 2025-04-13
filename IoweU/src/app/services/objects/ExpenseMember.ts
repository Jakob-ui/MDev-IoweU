import { Products } from './Products';
export interface ExpenseMember {
  memberId: string;
  amountToPay: number;
  split?: number;
  products?: Products[];
}
