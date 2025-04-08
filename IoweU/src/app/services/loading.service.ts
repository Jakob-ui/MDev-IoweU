import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  show() {
    this.loadingSubject.next(true); // Lade-Overlay aktivieren
  }

  hide() {
    this.loadingSubject.next(false); // Lade-Overlay deaktivieren
  }
}