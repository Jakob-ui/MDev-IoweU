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
  sumExpenseAmount: number; // Summe der Ausgaben, die ich bezahlt habe für andere (den Betrag, den ich für mich bezahlt habe muss man davor wegrechnen)
  countExpenseAmount: number; // Anzahl der Ausgaben, die ich bezahlt habe
  sumAmountReceived: number; // Summe der erhaltenen Beträge (wenn andere ihre Schulden bei mir beglichen haben)
  countAmountReceived: number; // Anzahl der erhaltenen Beträge
  sumExpenseMemberAmount: number; // Summe meiner Ausgaben, die von anderen Mitgliedern bezahlt wurden
  countExpenseMemberAmount: number; // Anzahl der Ausgaben, die von anderen Mitgliedern bezahlt wurden
  sumAmountPaid: number; // Summe meiner Schulen, die ich bezahlt habe
  countAmountPaid: number; // Anzahl meiner Schulen, die ich bezahlt habe
}
