import { Users } from './Users';
import { Groups } from './Groups';
import { Expenses } from './Expenses';
import { Products } from './Products';
import { GroupMemberships } from './GroupMemberships';

export interface Members {
  userId: string; // Referenz zum Benutzer in der Gruppe
  role: 'admin' | 'member'; // Rolle des Mitglieds
  joinedAt: string; // Beitrittsdatum
}
