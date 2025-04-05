import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';
import { GroupMemberships } from './GroupMemberships';
export interface Users {
  id: string;
  name: string;
  email: string;
  color: string;
  lastedited: string;
  groups: GroupMemberships[]; // Liste der Gruppen, in denen der Benutzer Mitglied ist
}
