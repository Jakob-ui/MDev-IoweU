import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ViewChildren,
  QueryList,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonTitle,
  IonToolbar,
  IonIcon,
} from '@ionic/angular/standalone';
import Scrollama from 'scrollama';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  personOutline,
  peopleOutline,
  calendarOutline,
  calculatorOutline,
  repeatOutline,
  statsChartOutline,
  chevronDownOutline,
  listOutline,
  documentOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-landingpage',
  templateUrl: './landingpage.page.html',
  styleUrls: ['./landingpage.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonMenuButton,
    RouterLink,
    IonIcon,
  ],
})
export class LandingpagePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('featureItem') featureItems!: QueryList<ElementRef>;
  currentFeatureIndex = 0;

  private scroller: any;

  constructor(private ngZone: NgZone) {
    // Register icons
    addIcons({
      peopleOutline,
      listOutline,
      documentOutline,
      calculatorOutline,
      repeatOutline,
      statsChartOutline,
    });
  }

  teamMembers = [
    {
      name: 'Jakob Laschober',
      role: 'Backend Developer',
      photo: 'assets/Jakob.jpg',
    },
    {
      name: 'Livia Hochstöger',
      role: 'Frontend Developer & Design',
      photo: 'assets/Livia.jpg',
    },
    {
      name: 'Mateusz Osmanski',
      role: 'Backend Developer & Scrummaster',
      photo: 'assets/Mateusz.jpg',
    },
    {
      name: 'Michaela Kopf',
      role: 'Frontend Developer & Design',
      photo: 'assets/Michaela.jpg',
    },
    {
      name: 'Sophie Plaskacz',
      role: 'Frontend Developer & Design',
      photo: 'assets/Sophie.jpg',
    },
  ];

  features = [
    {
      title: 'Gruppen erstellen',
      description:
        'Erstelle verschiedene Gruppen für diverse Zwecke, z.B. WG oder Reisen.',
      icon: 'people-outline',
      hasDetails: false,
      details: null,
      image: 'assets/feature1.png',
    },
    {
      title: 'Abrechnungslisten verwalten',
      description:
        'Verwalte verschiedene Listen für Ausgaben mit denselben oder unterschiedlichen Personen.',
      icon: 'list-outline',
      hasDetails: false,
      details: null,
      image: 'assets/feature2.png',
    },
    {
      title: 'Vorhandene Templates',
      description:
        'Templates für Reisen und WG mit zusätzlichen Funktionen wie Produktvorschlägen und Abschreibungsdauer.',
      icon: 'document-outline',
      hasDetails: false,
      details: null,
      image: 'assets/feature3.png',
    },
    {
      title: 'Schuldner und Abrechnungsarten',
      description:
        'Wähle die Schuldner und die Abrechnungsart in Prozent/Anteilig bei der Hinzufügung von Ausgaben.',
      icon: 'calculator-outline',
      hasDetails: false,
      details: null,
      image: 'assets/feature4.png',
    },
    {
      title: 'Wiederkehrende Kosten',
      description:
        'Trage wiederkehrende Kosten wie Miete in vorbestimmten Abständen ein.',
      icon: 'repeat-outline',
      hasDetails: true,
      details: 'Erstelle Kosten, die sich wiederholen',
      image: 'assets/feature5.png',
    },
    {
      title: 'Gesamtbilanz und Archiv',
      description:
        'Erhalte eine Übersicht über alle offenen Schulden sowie ein Archiv für beglichene Rückstände.',
      icon: 'stats-chart-outline',
      hasDetails: true,
      details:
        'Verfolge deine Finanzen und zahle deine Schulden mit einer klaren Übersicht der offenen Posten.',
      image: 'assets/feature6.png',
    },
  ];

  ngOnInit(): void {
    // Initialize Scrollama in onInit
    import('scrollama').then((scrollamaModule) => {
      this.ngZone.runOutsideAngular(() => {
        this.scroller = scrollamaModule.default();
      });
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.scroller) {
        console.error('Scrollama is not initialized yet');
        return;
      }

      this.ngZone.runOutsideAngular(() => {
        this.scroller
          .setup({
            step: '.feature-item',
            offset: 0.5,
            once: false,
          })
          .onStepEnter((event: any) => {
            const index = event.index;
            this.ngZone.run(() => {
              console.log(`Feature ${index} ist im Sichtbereich`);
              this.currentFeatureIndex = index;

              const featureItem =
                this.featureItems.toArray()[event.index].nativeElement;
              featureItem.classList.add('active');

              // Update phone position basierend auf progress
              const progress = event.progress;
              this.updatePhonePosition(index, progress); // Progress an updatePhonePosition übergeben
            });
          })
          .onStepExit((event: any) => {
            const index = event.index;
            console.log(`Feature ${index} hat den Sichtbereich verlassen`);

            const featureItem =
              this.featureItems.toArray()[event.index].nativeElement;
            featureItem.classList.remove('active');
          })
          .onStepProgress((event: any) => {
            // Optionale Kontrolle des Fortschritts
          });

        this.scroller.resize();
      });
    }, 500);
  }

  updatePhonePosition(index: number, progress: number): void {
    const phone = document.getElementById('phone-frame');
    const screenImg = document.getElementById('screen-img') as HTMLImageElement;
    if (!phone || !screenImg) return;

    const feature = this.features[index];
    const isEven = index % 2 === 0;

    // Starting position (opposite side of where it will end up)
    const startX = isEven ? -200 : 200;
    // Ending position
    const endX = isEven ? 200 : -200;

    if (progress < 0.5) {
      // First half of animation: rotate phone
      const rotationAmount = isEven ? progress * 2 * 90 : progress * 2 * -90;
      phone.style.transition = 'transform 0.5s ease-out';
      phone.style.transform = `translateX(${
        startX + (endX - startX) * progress * 2
      }px) rotateY(${rotationAmount}deg)`;
    } else if (progress >= 0.5 && progress < 0.9) {
      // Update the image when phone is fully rotated
      if (screenImg.src !== feature.image) {
        screenImg.src = feature.image;
      }

      // Start rotating back
      const reverseRotation = isEven
        ? (1 - (progress - 0.5) * 2) * 90
        : (1 - (progress - 0.5) * 2) * -90;
      phone.style.transition = 'transform 0.5s ease-in-out';
      phone.style.transform = `translateX(${
        startX + (endX - startX) * (progress - 0.5) * 2
      }px) rotateY(${reverseRotation}deg)`;
    } else {
      // Final position - fully on the other side
      phone.style.transition = 'transform 0.3s ease-in';
      phone.style.transform = `translateX(${endX}px) rotateY(0deg)`;
    }
  }

  ngOnDestroy(): void {
    // Clean up event listeners when component is destroyed
    if (this.scroller) {
      window.removeEventListener('resize', () => {
        this.scroller.resize();
      });
    }
  }
}
