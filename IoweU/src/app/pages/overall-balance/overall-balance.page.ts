import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonCard,
  IonCardSubtitle,
  IonCardTitle,
  IonList,
} from '@ionic/angular/standalone';
import { NavController, Platform } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from "../../services/expense.service";
import { Members } from "../../services/objects/Members";
import { Expenses } from "../../services/objects/Expenses";
import { Groups } from "../../services/objects/Groups";

@Component({
  selector: 'app-overall-balance',
  templateUrl: './overall-balance.page.html',
  styleUrls: ['./overall-balance.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    RouterModule,
    IonCard,
    IonCardSubtitle,
    IonCardTitle,
    IonList,
  ],
})
export class OverallBalancePage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platform = inject(Platform);
  private navCtrl = inject(NavController);
  private groupService = inject(GroupService);
  private loadingService = inject(LoadingService);
  private expenseService = inject(ExpenseService);
  private unsubscribeFromGroups: (() => void) | null = null;

  uid: string | null = '';
  username: string | null = '';
  iosIcons: boolean = false;

  expenses: Expenses[] = [];
  groups: Groups[] = [];

  groupId: string | null = '';
  sumExpenses: number = 0;
  countExpenses: number = 0;

  myGroupSum: number = 0;

  constructor() {}

  async ngOnInit() {
    this.loadingService.show();
    try {
      console.log('Initialisiere OverallBalancePage...');
      await this.authService.waitForUser();

      if (this.authService.currentUser) {
        console.log('Eingeloggter Benutzer:', this.authService.currentUser);
        this.username = this.authService.currentUser.username;
        this.uid = this.authService.currentUser.uid;
        this.iosIcons = this.platform.is('ios');

        const userColor = this.authService.currentUser.color;
        document.documentElement.style.setProperty('--user-color', userColor);

        await this.loadMyGroups();  // Gruppen laden und warten, bis alles geladen ist
      } else {
        console.error('Fehler: Kein Benutzer eingeloggt.');
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  async loadMyGroups() {
    try {
      if (this.authService.currentUser) {
        const uid = this.authService.currentUser.uid;
        console.log('Lade Gruppen für Benutzer UID:', uid);

        this.unsubscribeFromGroups = await this.groupService.getGroupsByUserId(
          uid,
          async (groups) => {
            console.log('Gefundene Gruppen:', groups);
            this.groups = groups;

            // Array für Promises erstellen
            const groupPromises = groups.map(group =>
              new Promise<void>((resolve) => {
                this.expenseService.getExpenseByGroup(group.groupId, false, (expenses) => {
                  console.log(`Ausgaben für Gruppe ${group.groupname}:`, expenses);
                  this.expenses = expenses;

                  // Rufe calculateExpenseSum für jede Gruppe auf
                  const sumForGroup = this.calculateExpenseSum(group, uid);
                  console.log(`Summe der Ausgaben für Gruppe "${group.groupname}" für Benutzer ${uid}:`, sumForGroup);

                  // Summe speichern oder weiterverwenden
                  this.sumExpenses += sumForGroup;
                  this.countExpenses += 1;
                  resolve();
                });
              })
            );

            // Warten, bis alle Gruppen verarbeitet sind
            await Promise.all(groupPromises);

            // Nachdem alle Daten geladen sind, PieChart erstellen
            this.createPieChart();
          }
        );
      }
    } catch (e) {
      console.error('Fehler beim Laden der Gruppen:', e);
    }
  }

  calculateExpenseSum(group: Groups, uid: string): number {
    let myGroupSum = 0; // Um sicherzustellen, dass jede Gruppe eine eigene Summe bekommt

    // Logge alle Ausgaben, um die Struktur zu überprüfen
    this.expenses.forEach(expense => {
      //console.log('Expense:', expense); // Log für jede Ausgabe

      // Prüfen, ob diese Ausgabe zu der aktuellen Gruppe gehört
      if (expense.expenseId) {
        //console.log(`ExpenseID "${expense.expenseId}" gehört zu dieser Gruppe.`);

        // Iteriere über alle Mitglieder der Ausgabe und summiere die amountToPay, wenn die memberId übereinstimmt
        myGroupSum += expense.expenseMember.reduce((sum, expenseMember) => {
          //console.log('Member:', expenseMember.memberId); // Log für jedes Mitglied der Ausgabe
          if (expenseMember.memberId === uid) {
            //console.log(`Benutzer ${uid} schuldet:`, expenseMember.amountToPay);
            return sum + (expenseMember.amountToPay || 0); // Falls amountToPay nicht gesetzt ist, gehe von 0 aus
          }
          return sum;
        }, 0);
      }
    });

    //console.log(`Berechnete Summe für Gruppe "${group.groupname}" für Benutzer ${uid}:`, myGroupSum);
    return myGroupSum;
  }

  createPieChart() {
    console.log('Erstelle PieChart...');

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    // Leere den Container für das Diagramm
    d3.select('.balance-chart').html('');

    // Füge ein SVG-Element hinzu, das das PieChart enthält
    const svg = d3.select('.balance-chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Erstelle ein Objekt, um die Gruppennamen und die Summen der Ausgaben pro Gruppe zu speichern
    const expensesByGroup: { [key: string]: { groupName: string, myGroupSum: number } } = {};

    // Durchlaufe alle Gruppen und berechne die Summe der Ausgaben pro Gruppe
    this.groups.forEach(group => {
      // Berechne die Summe für diese Gruppe
      const groupSum = this.calculateExpenseSum(group, this.uid || '');

      // Speichere sowohl den Gruppennamen als auch die berechnete Summe
      expensesByGroup[group.groupname] = {
        groupName: group.groupname,
        myGroupSum: groupSum
      };

      console.log(`Berechnete Summe für Gruppe "${group.groupname}": ${groupSum}`);
    });

    console.log('Gruppierte Ausgaben für PieChart:', expensesByGroup);

    // Bereite die Daten für das PieChart vor
    const pieData = Object.values(expensesByGroup); // Extrahiere die Werte (die Objekte mit name und summe)

    console.log('PieData vor der Diagrammerstellung:', pieData);

    // Sicherstellen, dass pieData korrekt an d3.pie() übergeben wird
    if (pieData.length === 0) {
      console.log("Keine Daten für das PieChart verfügbar.");
      return;
    }

    // Erstelle das PieChart mit d3.pie()
    const pie = d3.pie<{ groupName: string; myGroupSum: number }>()
      .value(d => d.myGroupSum);

    const data_ready = pie(pieData);

    console.log('Data Ready für PieChart:', data_ready);

    // Erstelle den arc für das PieChart
    const arc = d3.arc<d3.PieArcDatum<{ groupName: string; myGroupSum: number }>>()
      .innerRadius(0)
      .outerRadius(radius);

    // Füge die Segmente des PieCharts hinzu
    svg.selectAll('slices')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => color(i.toString()))
      .attr('stroke', '#fff')
      .style('stroke-width', '2px');

    // Füge die Labels für jedes Segment hinzu
    svg.selectAll('labels')
      .data(data_ready)
      .enter()
      .append('text')
      .text(d => d.data.groupName)
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .style('text-anchor', 'middle')
      .style('font-size', 12);

    console.log('PieChart erfolgreich erstellt.');
  }

}
