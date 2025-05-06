import { Products } from './Products';
import { ExpenseMember } from './ExpenseMember';
import { ShoppingProducts } from './ShoppingProducts';
import { Shoppinglists} from "./Shoppinglists";

export interface ShoppingCarts {
  shoppingcartId: string;
  groupId: string;
  shoppingProducts: ShoppingProducts[];
}
