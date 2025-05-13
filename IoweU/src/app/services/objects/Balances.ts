import { Expenses } from './Expenses';
import { Members } from './Members';
import { Groups } from './Groups';

export interface Balances {
  groupId: string;
  userAId: string;
  userACredit: number;
  userBId: string;
  userBCredit: number;
  lastUpdated: string;
  relatedExpenseId: string[];
  relatedTransactionId: string[];
}
