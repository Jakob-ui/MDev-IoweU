import { inject, Injectable } from '@angular/core';
import {Firestore, collection, doc, setDoc, deleteDoc, getDoc, getDocs, where, query, onSnapshot,} from '@angular/fire/firestore';
import { ShoppingProducts } from '../services/objects/ShoppingProducts';
import { ShoppingCarts } from './objects/ShoppingCarts';
import { Shoppinglists } from './objects/Shoppinglists';

@Injectable({
  providedIn: 'root',
})

export class ShoppinglistService {
  private firestore = inject(Firestore);

  async createEmptyShoppingList(groupId: string): Promise<void> {
    const shoppinglistId = doc(collection(this.firestore, 'groups', groupId, 'shoppingLists')).id;
    const shoppingList: Shoppinglists = {
      shoppinglistId,
      groupId,
      shoppinglistName: 'Einkaufsliste',
      shoppingProducts: [],
    };

    const shoppingListRef = doc(this.firestore, 'groups', groupId, 'shoppingLists', shoppinglistId);
    await setDoc(shoppingListRef, shoppingList);

    console.log('Leere Einkaufsliste erstellt:', shoppinglistId);
  }


  async addShoppingProduct(
    groupId: string,
    productData: ShoppingProducts
  ): Promise<void> {
    try {
      // Zuerst die Shoppinglist der Gruppe holen oder erstellen, falls nicht vorhanden
      let shoppingList = await this.getShoppingListByGroupId(groupId);

      if (!shoppingList) {
        // Keine Einkaufsliste vorhanden - erstelle eine neue
        const shoppinglistId = doc(collection(this.firestore, 'groups', groupId, 'shoppingLists')).id;
        shoppingList = {
          shoppinglistId,
          groupId,
          shoppinglistName: 'Einkaufsliste', // Standardname der Einkaufsliste
          shoppingProducts: [],
        };

        // Neue Einkaufsliste in der Firestore-Datenbank speichern
        await setDoc(doc(this.firestore, 'groups', groupId, 'shoppingLists', shoppinglistId), shoppingList);
        console.log('Neue Einkaufsliste erstellt:', shoppinglistId);
      }

      // Neue ID für das Produkt erzeugen
      const shoppingProductId = doc(collection(this.firestore, 'groups', groupId, 'shoppingLists', shoppingList.shoppinglistId, 'shoppingProducts')).id;

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

      // Produkt in der entsprechenden Subcollection der Einkaufsliste speichern
      const productRef = doc(this.firestore, 'groups', groupId, 'shoppingLists', shoppingList.shoppinglistId, 'shoppingProducts', shoppingProductId);
      await setDoc(productRef, shoppingProduct);

      // Shoppinglist mit dem neuen Produkt aktualisieren
      const updatedShoppingList = {
        ...shoppingList,
        shoppingProducts: [...shoppingList.shoppingProducts, shoppingProduct],
      };
      const shoppingListRef = doc(this.firestore, 'groups', groupId, 'shoppingLists', shoppingList.shoppinglistId);
      await setDoc(shoppingListRef, updatedShoppingList);

      console.log('Produkt erfolgreich gespeichert und zur Einkaufsliste hinzugefügt:', shoppingProductId);
    } catch (error) {
      console.error('Fehler beim Speichern des Produkts:', error);
      throw error;
    }
  }

  async getShoppingListIdByGroupId(groupId: string): Promise<string | null> {
    try {
      const shoppingListsRef = collection(this.firestore, 'groups', groupId, 'shoppingLists');
      const snapshot = await getDocs(shoppingListsRef);

      if (!snapshot.empty) {
        const shoppingListDoc = snapshot.docs[0]; // Hole die erste Liste (es sollte nur eine geben)
        return shoppingListDoc.id; // Gib die ID der ersten ShoppingList zurück
      } else {
        console.warn('Keine Einkaufsliste gefunden.');
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der shoppingListId:', error);
      return null;
    }
  }

  async getShoppingCartIdByGroupId(groupId: string): Promise<string | null> {
    try {
      const shoppingCartRef = collection(this.firestore, 'groups', groupId, 'shoppingCart');
      const snapshot = await getDocs(shoppingCartRef);

      if (!snapshot.empty) {
        const shoppingCartDoc = snapshot.docs[0]; // Hole die erste ShoppingCart (es sollte nur eine geben)
        return shoppingCartDoc.id; // Gib die ID der ersten ShoppingCart zurück
      } else {
        console.warn('Kein Warenkorb gefunden.');
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der shoppingCartId:', error);
      return null;
    }
  }



// Holt die Einkaufsliste einer Gruppe aus der Datenbank
  async getShoppingListByGroupId(groupId: string): Promise<Shoppinglists | null> {
    const shoppingListRef = collection(this.firestore, 'groups', groupId, 'shoppingLists');
    const snapshot = await getDocs(shoppingListRef);
    if (!snapshot.empty) {
      const shoppingListDoc = snapshot.docs[0]; // Nimm das erste (es sollte nur eine geben)
      return shoppingListDoc.data() as Shoppinglists;
    } else {
      return null; // Keine Einkaufsliste vorhanden
    }
  }

  async getShoppingProducts(groupId: string, shoppingListId: string): Promise<ShoppingProducts[]> {
    try {
      // Korrigierter Pfad zur Sammlung 'shoppingProducts' in der Firestore-Datenbank
      const productsRef = collection(this.firestore, 'groups', groupId, 'shoppingLists', shoppingListId, 'shoppingProducts');
      const productSnapshot = await getDocs(productsRef);

      // Alle Produkte als Array von ShoppingProducts zurückgeben
      const products: ShoppingProducts[] = productSnapshot.docs.map(doc => doc.data() as ShoppingProducts);
      return products;
    } catch (error) {
      console.error('Fehler beim Abrufen der Produkte:', error);
      throw error;
    }
  }

  async getShoppingCartProducts(groupId: string, shoppingcartId: string): Promise<ShoppingProducts[]> {
    try {
      const productsRef = collection(this.firestore, 'groups', groupId, 'shoppingCart', shoppingcartId, 'shoppingProducts');
      const productSnapshot = await getDocs(productsRef);

      const products: ShoppingProducts[] = productSnapshot.docs.map(doc => doc.data() as ShoppingProducts);
      return products;
    } catch (error) {
      console.error('Fehler beim Abrufen der Produkte aus dem Warenkorb:', error);
      throw error;
    }
  }


  async getShoppingCartByGroupId(groupId: string): Promise<ShoppingCarts | null> {
    const cartRef = collection(this.firestore, 'groups', groupId, 'shoppingCart');
    const cartSnapshot = await getDocs(cartRef);

    if (!cartSnapshot.empty) {
      const cartData = cartSnapshot.docs.map(doc => doc.data()) as ShoppingCarts[];
      return cartData.length > 0 ? cartData[0] : null; // Nur das erste Element, wenn es mehrere gibt
    } else {
      return null; // Wenn keine Daten im Warenkorb sind
    }
  }


  async moveProductToShoppingCart(groupId: string, shoppingListId: string, shoppingProductId: string): Promise<void> {
    try {
      // Produkt aus der Einkaufsliste holen
      const productRef = doc(this.firestore, 'groups', groupId, 'shoppingLists', shoppingListId, 'shoppingProducts', shoppingProductId);
      const productSnapshot = await getDoc(productRef);

      if (!productSnapshot.exists()) {
        throw new Error('Produkt nicht gefunden');
      }

      const productData = productSnapshot.data() as ShoppingProducts;

      // Status auf "im Warenkorb" setzen
      const updatedProduct: ShoppingProducts = {
        ...productData,
        status: 'im Warenkorb',
      };

      // Hole oder erstelle den shoppingCart-Eintrag
      let shoppingCart = await this.getShoppingCartByGroupId(groupId);
      let shoppingcartId: string;

      if (!shoppingCart) {
        shoppingcartId = doc(collection(this.firestore, 'groups', groupId, 'shoppingCart')).id;

        shoppingCart = {
          shoppingcartId,
          groupId,
          shoppingProducts: [], // wird nicht mehr direkt genutzt, da Produkte als Subcollection gespeichert werden
        };

        // Neuen Einkaufswagen-Eintrag erstellen
        await setDoc(doc(this.firestore, 'groups', groupId, 'shoppingCart', shoppingcartId), shoppingCart);
        console.log('Neuer Warenkorb erstellt:', shoppingcartId);
      } else {
        shoppingcartId = shoppingCart.shoppingcartId;
      }

      // Neues Produkt-Dokument in die shoppingCart Subcollection schreiben
      const newProductRef = doc(collection(this.firestore, 'groups', groupId, 'shoppingCart', shoppingcartId, 'shoppingProducts'));
      await setDoc(newProductRef, {
        ...updatedProduct,
        shoppingProductId: newProductRef.id, // optional: ID auch im Objekt speichern
      });

      // Produkt aus der ursprünglichen Liste entfernen
      await deleteDoc(productRef);

      console.log('Produkt erfolgreich in den Warenkorb verschoben');
    } catch (error) {
      console.error('Fehler beim Verschieben des Produkts:', error);
      throw error;
    }
  }

  async moveProductBackToShoppingList(groupId: string, shoppingCartId: string, shoppingProductId: string): Promise<void> {
    try {
      // 1. Produkt aus dem Warenkorb holen
      const productRef = doc(this.firestore, 'groups', groupId, 'shoppingCart', shoppingCartId, 'shoppingProducts', shoppingProductId);
      const productSnapshot = await getDoc(productRef);

      if (!productSnapshot.exists()) {
        throw new Error('Produkt nicht gefunden');
      }

      const productData = productSnapshot.data() as ShoppingProducts;

      // 2. Status auf "open" setzen
      const updatedProduct: ShoppingProducts = {
        ...productData,
        status: 'open',
      };

      // 3. Einkaufslisten-Dokument holen oder erstellen
      let shoppingList: Shoppinglists | null = await this.getShoppingListByGroupId(groupId);
      let shoppinglistId: string;

      if (!shoppingList) {
        shoppinglistId = doc(collection(this.firestore, 'groups', groupId, 'shoppingLists')).id;

        shoppingList = {
          shoppinglistId,
          groupId,
          shoppinglistName: 'Einkaufsliste',
          shoppingProducts: []
        };


        await setDoc(doc(this.firestore, 'groups', groupId, 'shoppingLists', shoppinglistId), shoppingList);
        console.log('Neue Einkaufsliste erstellt:', shoppinglistId);
      } else {
        shoppinglistId = shoppingList.shoppinglistId;
      }

      // 4. Produkt in die Einkaufsliste verschieben
      const newProductRef = doc(collection(this.firestore, 'groups', groupId, 'shoppingLists', shoppinglistId, 'shoppingProducts'));
      await setDoc(newProductRef, {
        ...updatedProduct,
        shoppingProductId: newProductRef.id,
      });

      // 5. Produkt aus dem Warenkorb löschen
      await deleteDoc(productRef);

      console.log('Produkt erfolgreich zurück in die Einkaufsliste verschoben');
    } catch (error) {
      console.error('Fehler beim Zurückverschieben:', error);
      throw error;
    }
  }


  async getShoppingProductById(
    groupId: string,
    shoppingListId: string,
    shoppingProductId: string
  ): Promise<ShoppingProducts | null> {
    try {
      const productRef = doc(
        this.firestore,
        'groups',
        groupId,
        'shoppingLists',
        shoppingListId,
        'shoppingProducts',
        shoppingProductId
      );
      const productSnapshot = await getDoc(productRef);

      if (productSnapshot.exists()) {
        const product = productSnapshot.data() as ShoppingProducts;

        // Debug-Ausgabe für alle Felder
        console.log('ShoppingProduct geladen:', {
          shoppingProductId: product.shoppingProductId,
          memberId: product.memberId,
          forMemberId: product.forMemberId,
          productname: product.productname,
          quantity: product.quantity,
          unit: product.unit,
          date: product.date,
          status: product.status,
        });

        return product;
      } else {
        console.warn('Produkt nicht gefunden.');
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des Produkts:', error);
      throw error;
    }
  }

  async getShoppingCartProductById(
    groupId: string,
    shoppingCartId: string,
    shoppingProductId: string
  ): Promise<ShoppingProducts | null> {
    try {
      const productRef = doc(
        this.firestore,
        'groups',
        groupId,
        'shoppingCart',
        shoppingCartId,
        'shoppingProducts',
        shoppingProductId
      );
      const productSnapshot = await getDoc(productRef);

      if (productSnapshot.exists()) {
        const product = productSnapshot.data() as ShoppingProducts;

        // Debug-Ausgabe für alle Felder
        console.log('ShoppingProduct geladen:', {
          shoppingProductId: product.shoppingProductId,
          memberId: product.memberId,
          forMemberId: product.forMemberId,
          productname: product.productname,
          quantity: product.quantity,
          unit: product.unit,
          date: product.date,
          status: product.status,
        });

        return product;
      } else {
        console.warn('Produkt nicht gefunden.');
        return null;
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des Produkts:', error);
      throw error;
    }
  }



  async editShoppingProduct(
    groupId: string,
    shoppingListId: string,
    shoppingProductId: string,
    updatedProductData: ShoppingProducts
  ): Promise<void> {
    try {
      // Das Produkt in der Subcollection `shoppingProducts` der Einkaufsliste abrufen
      const productRef = doc(this.firestore, 'groups', groupId, 'shoppingLists', shoppingListId, 'shoppingProducts', shoppingProductId);

      // Produkt aktualisieren
      await setDoc(productRef, updatedProductData, { merge: true });

      console.log('Produkt erfolgreich aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Produkts:', error);
      throw error;
    }
  }

  async deleteShoppingProduct(groupId: string, shoppingListId: string, shoppingProductId: string): Promise<void> {
    try {
      // Das Produkt aus der Subcollection der Einkaufsliste löschen
      const productRef = doc(this.firestore, 'groups', groupId, 'shoppingLists', shoppingListId, 'shoppingProducts', shoppingProductId);

      await deleteDoc(productRef);

      console.log('Produkt erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen des Produkts:', error);
      throw error;
    }
  }

  async deleteAllProductsFromShoppingCart(groupId: string, shoppingCartId: string): Promise<void> {
    try {
      const productsSnapshot = await getDocs(collection(this.firestore, 'groups', groupId, 'shoppingCart', shoppingCartId, 'shoppingProducts'));

      const deletePromises = productsSnapshot.docs.map(doc => {
        const productId = doc.id;
        return deleteDoc(doc.ref); // Lösche jedes Produkt
      });

      await Promise.all(deletePromises);
      console.log('Alle Produkte aus dem Warenkorb wurden erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen der Produkte:', error);
      throw error;
    }
  }


  listenToShoppingProductsChanges(
    groupId: string,
    shoppingListId: string | null,
    updateProductsCallback: (products: ShoppingProducts[]) => void
  ): () => void {
    if (!shoppingListId) {
      console.error('ShoppingListId ist null – Listener wird nicht gesetzt.');
      return () => {}; // Dummy unsubscribe-Funktion
    }

    const productsRef = collection(
      this.firestore,
      'groups',
      groupId,
      'shoppingLists',
      shoppingListId,
      'shoppingProducts'
    );

    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const products: ShoppingProducts[] = snapshot.docs.map((doc) => doc.data() as ShoppingProducts);
      updateProductsCallback(products);
    });

    return unsubscribe;
  }

  listenToShoppingCartChanges(
    groupId: string,
    shoppingCartId: string | null,
    updateProductsCallback: (products: ShoppingProducts[]) => void
  ): () => void {
    if (!shoppingCartId) {
      console.error('ShoppingCartId ist null – Listener wird nicht gesetzt.');
      return () => {}; // Dummy unsubscribe-Funktion
    }

    const productsRef = collection(
      this.firestore,
      'groups',
      groupId,
      'shoppingCart',
      shoppingCartId,
      'shoppingProducts'
    );

    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const products: ShoppingProducts[] = snapshot.docs.map((doc) => doc.data() as ShoppingProducts);

      // Überprüfen, ob es Produkte gibt, die angezeigt werden müssen
      if (products.length === 0) {
        console.log('Der Warenkorb ist leer.');
      }

      updateProductsCallback(products); // Callback-Funktion aufrufen, um die Produkte zu aktualisieren
    });

    return unsubscribe;
  }


}
