import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';
import { Members } from './Members';
import { GroupMemberships } from './GroupMemberships';
export interface Groups {
  id: string;
  name: string;
  foundationdate: Date;
  founder: string; // Der Benutzer, der die Gruppe gegründet hat
  members: Members[]; // Eine Liste von Mitgliedern in der Gruppe
  accessCode: number; // Zugangscode zur Gruppe
  features: string[]; // Liste von Funktionen (optional)
  expenses: Expenses[]; // Liste der Ausgaben in der Gruppe
}
