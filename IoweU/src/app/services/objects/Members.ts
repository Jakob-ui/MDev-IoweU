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
  sumExpenseAmount: number; // Summe der Ausgaben, die ich bezahlt habe
  countExpenseAmount: number; // Anzahl der Ausgaben, die ich bezahlt habe
  sumAmountReceived: number; // Summe der erhaltenen Beträge
  countAmountReceived: number; // Anzahl der erhaltenen Beträge
  sumExpenseMemberAmount: number; // Summe meiner Ausgaben, die von anderen Mitgliedern bezahlt wurden
  countExpenseMemberAmount: number; // Anzahl der Ausgaben, die von anderen Mitgliedern bezahlt wurden / oder von
  sumAmountPaid: number; // Summe der Beträge, die ich bezahlt habe
  countAmountPaid: number; // Anzahl der Beträge, die ich bezahlt habe
}
