import { Expenses } from './Expenses';
import { Members } from './Members';

export interface Groups {
  id: string;
  name: string;
  foundationdate: Date;
  founder: string; // Der Benutzer, der die Gruppe gegründet hat
  groupImage: string;
  members: Members[]; // Eine Liste von Mitgliedern in der Gruppe
  accessCode: number; // Zugangscode zur Gruppe
  features: string[]; // Liste von Funktionen (optional)
  expenses: Expenses[]; // Liste der Ausgaben in der Gruppe
}