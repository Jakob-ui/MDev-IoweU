import { inject, Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  Storage,
  uploadBytes,
} from '@angular/fire/storage';
import { NgxImageCompressService } from 'ngx-image-compress';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private imageCompress = inject(NgxImageCompressService);

  async uploadImage(
    id: string,
    imageBlob: Blob,
    path: string,
    compress: boolean = true
  ): Promise<string> {
    try {
      let finalBlob = imageBlob;

      // Compress the image if the compress flag is true
      if (compress) {
        const reader = new FileReader();
        const imageDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageBlob);
        });

        const compressedImage = await this.imageCompress.compressFile(
          imageDataUrl,
          -1, // Orientation (auto-detect)
          50, // Quality (0-100)
          50  // Resize percentage
        );

        finalBlob = this.dataURLtoBlob(compressedImage);
        console.log('Image compressed successfully');
      }

      const storageRef = ref(this.storage, path);
      const uploadResult = await uploadBytes(storageRef, finalBlob);
      console.log('Image uploaded successfully:', uploadResult);

      // Get the download URL of the uploaded image
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