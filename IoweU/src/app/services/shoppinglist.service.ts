import { inject, Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, getDoc } from '@angular/fire/firestore';
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

  async getShoppingProductById(groupId: string, shoppingProductId: string): Promise<ShoppingProducts | null> {
    try {
      // Referenz zum Produkt-Dokument in der Firestore-Datenbank
      const productRef = doc(this.firestore, 'groups', groupId, 'shoppingProducts', shoppingProductId);

      // Abrufen des Dokuments
      const productDoc = await getDoc(productRef);

      // Wenn das Dokument existiert, geben wir die Produktdetails zurück
      if (productDoc.exists()) {
        return productDoc.data() as ShoppingProducts;
      } else {
        console.warn('Kein Produkt mit dieser ID gefunden');
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des Produkts:', error);
      return null;
    }
  }




  // Löscht ein Produkt aus der Datenbank
  async deleteShoppingProduct(groupId: string, shoppingProductId: string): Promise<void> {
    try {
      // Referenz zum Produkt in Firestore
      const productRef = doc(this.firestore, 'groups', groupId, 'shoppingProducts', shoppingProductId);

      // Löscht das Produkt
      await deleteDoc(productRef);

      console.log('Produkt erfolgreich gelöscht:', shoppingProductId);
    } catch (error) {
      console.error('Fehler beim Löschen des Produkts:', error);
      throw error;
    }
  }

  async editShoppingProduct(
    groupId: string,
    shoppingProductId: string,
    updatedData: Partial<ShoppingProducts>
  ): Promise<void> {
    try {
      // Referenz zum Produkt in Firestore
      const productRef = doc(this.firestore, 'groups', groupId, 'shoppingProducts', shoppingProductId);

      // Aktualisiert das Produkt mit den neuen Daten
      await setDoc(productRef, updatedData, { merge: true });

      console.log('Produkt erfolgreich aktualisiert:', shoppingProductId);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Produkts:', error);
      throw error;
    }
  }

}
