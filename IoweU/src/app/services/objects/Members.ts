import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';

export interface Members {
  userId: string; 
  role: 'admin' | 'member'; 
  joinedAt: string; 
}
