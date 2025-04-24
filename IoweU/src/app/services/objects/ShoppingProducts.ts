import { Products } from './Products';
import { ExpenseMember } from './ExpenseMember';
import { Shoppinglists } from './Shoppinglists';
import { ShoppingCarts } from './ShoppingCarts';

export interface ShoppingProducts {
  shoppingProductId: string;
  memberId: string;
  forMemberId: string;
  productname: string;
  quantity: number;
  unit: string;
  date: string;
  status: string;
}
