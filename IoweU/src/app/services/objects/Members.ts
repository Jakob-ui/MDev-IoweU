import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';

export interface Members {
  uid: string;
  username: string;
  role: 'member' | 'founder';
  color: string;
  joinedAt: string;
  sumExpenseAmount?: number;
  countExpenseAmount?: number;
  sumAmountReceived?: number;
  countAmountReceived?: number;
  sumExpenseMemberAmount?: number;
  countExpenseMemberAmount?: number;
  sumAmountPaid?: number;
  countAmountPaid?: number;
}
