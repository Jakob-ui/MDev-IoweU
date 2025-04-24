import { inject, Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc } from '@angular/fire/firestore';
import { ShoppingProducts } from '../services/objects/ShoppingProducts';
import {getDocs} from "firebase/firestore";

@Injectable({
  providedIn: 'root',
})
export class ShoppinglistService {
  private firestore = inject(Firestore);

  // Speichert ein neues Produkt in der Datenbank
  async addShoppingProduct(
    groupId: string,
    shoppinglistId: string,
    productData: ShoppingProducts
  ): Promise<void> {
    try {
      // Neue ID erzeugen für das Produkt
      const shoppingProductId = doc(
        collection(this.firestore, 'groups', groupId, 'shoppingProducts')
      ).id;

      // Neues Produktobjekt mit generierter ID
      const shoppingProduct: ShoppingProducts = {
        shoppingProductId,
        memberId: productData.memberId,
        forMemberId: productData.forMemberId,
        productname: productData.productname,
        quantity: productData.quantity,
        unit: productData.unit,
        date: productData.date,
        status: productData.status,
      };

      // In Firestore speichern
      const productRef = doc(
        this.firestore,
        'groups',
        groupId,
        'shoppingProducts',
        shoppingProductId
      );
      await setDoc(productRef, shoppingProduct);

      console.log('Produkt erfolgreich gespeichert:', shoppingProductId);
    } catch (error) {
      console.error('Fehler beim Speichern des Produkts:', error);
      throw error;
    }
  }

  async getShoppingProducts(groupId: string): Promise<ShoppingProducts[]> {
    const shoppingProductRef = collection(this.firestore, 'groups', groupId, 'shoppingProducts');
    const snapshot = await getDocs(shoppingProductRef);
    return snapshot.docs.map(doc => doc.data() as ShoppingProducts);
  }
}
