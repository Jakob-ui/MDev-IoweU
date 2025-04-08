import { Expenses } from './Expenses';
import { Members } from './Members';

export interface Groups {
  groupId: string;
  groupname: string;
  foundationdate: string;
  founder: string; // Der Benutzer, der die Gruppe gegründet hat
  groupimage: string;
  members: Members[]; // Eine Liste von Mitgliedern in der Gruppe
  accessCode: string; // Zugangscode zur Gruppe
  features: string[]; // Liste von Funktionen (optional)
  expenses: Expenses[]; // Liste der Ausgaben in der Gruppe
  SumExpenses?: number;
  memberIds: string[]; //----------------nur temporär!!!!!!!!!!!!!
}
