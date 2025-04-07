import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';

export interface Members {
  memberId: string;
  guid: string;
  username: string;
  role: 'member';
  color: string;
  joinedAt: string;
}
