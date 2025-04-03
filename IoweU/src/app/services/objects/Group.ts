import { User } from './User';
export interface Group {
  id: string;
  name: string;
  foundationdate: Date;
  founder: string;
  members: string[];
  accessCode: number;
  features: string[];
  }