import { Expenses } from './Expenses';
import { Members } from './Members';
import { Groups } from './Groups';

export interface Balances {
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  lastUpdated: string;
  relatedExpenseId: string[];
}
