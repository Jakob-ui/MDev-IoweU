import { inject, Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  Storage,
  uploadBytes,
} from '@angular/fire/storage';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  async uploadImage(
    id: string,
    imageBlob: Blob,
    path: string
  ): Promise<string> {
    try {
      const storageRef = ref(this.storage, path);
      const uploadResult = await uploadBytes(storageRef, imageBlob);
      console.log('Image uploaded successfully:', uploadResult);

      // Hole die Download-URL des hochgeladenen Bildes
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading group image:', error);
      throw error;
    }
  }

  async deleteImage(path: string): Promise<void> {
    try {
      // Referenz auf das Bild im Storage
      const storageRef = ref(this.storage, path);

      // Lösche das Bild
      await deleteObject(storageRef);
      console.log(`Bild unter dem Pfad "${path}" erfolgreich gelöscht.`);
    } catch (error) {
      console.error(
        `Fehler beim Löschen des Bildes unter dem Pfad "${path}":`,
        error
      );
      throw error;
    }
  }

  dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}