import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';
import { GroupMemberships } from './GroupMemberships';
import { Members } from './Members';
import { ExpenseMembers } from './ExpenseMembers';

export interface Expenses {
  id: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  date: string;
  currency: string;
  category?: string;
  invoice?: string;
  repeat?: string;
  splitBy?: 'alle' | 'frei';
  splitType?: 'prozent' | 'produkte';
  members: ExpenseMembers[]; // Optional, aber dann musst du es im Code immer füllen
}

