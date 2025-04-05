import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';
import { GroupMemberships } from './GroupMemberships';
export interface GroupMemberships {
  groupId: string; // Verweis auf die Gruppe
  role: 'admin' | 'member'; // Rolle des Benutzers in dieser Gruppe
  joinedAt: string; // Wann der Benutzer der Gruppe beigetreten ist
}
