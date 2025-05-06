import { Expenses } from './Expenses';
import { Members } from './Members';

export interface Groups {
  groupId: string;
  position?: number;
  groupname: string;
  foundationdate: string;
  founder: string;
  groupimage: string;
  members: Members[];
  accessCode: string;
  features: string[];
  expenseId: string[];
  sumTotalExpenses?: number;
  countTotalExpenses?: number;
  sumTotalExpensesMembers?: number;
  countTotalExpensesMembers?: number;
}
