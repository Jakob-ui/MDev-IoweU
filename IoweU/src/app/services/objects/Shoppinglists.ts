import { Products } from './Products';
import { ExpenseMember } from './ExpenseMember';
import { ShoppingProducts } from './ShoppingProducts';

export interface Shoppinglists {
  shoppinglistId: string;
  groupId: string;
  shoppinglistName: string | "Einkaufsliste";
  shoppingProducts: ShoppingProducts[];
}
