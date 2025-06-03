import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false); // <-- Initialwert wieder auf false
  loading$ = this.loadingSubject.asObservable();

  private littleLoadingSubject = new BehaviorSubject<boolean>(false);
  littleLoading$ = this.littleLoadingSubject.asObservable();

  setLoading(isLoading: boolean) {
    this.loadingSubject.next(isLoading);
  }

  setLittleLoading(isLittleLoading: boolean) {
    this.littleLoadingSubject.next(isLittleLoading);
  }

  show() {
    this.setLoading(true);
  }

  hide() {
    this.setLoading(false);
  }

  showLittle() {
    this.setLittleLoading(true);
  }

  hideLittle() {
    this.setLittleLoading(false);
  }
}