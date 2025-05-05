import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonItem,
} from '@ionic/angular/standalone';
import { NavController, Platform } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { GroupService } from 'src/app/services/group.service';
import { LoadingService } from 'src/app/services/loading.service';
import { ExpenseService } from '../../services/expense.service';
import { Members } from '../../services/objects/Members';
import { Expenses } from '../../services/objects/Expenses';
import { Groups } from '../../services/objects/Groups';

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
    RouterModule,
    IonItem,
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
  groupExpenses: { groupName: string; sum: number }[] = [];

  groupId: string | null = '';
  myGroupSum: number = 0;
  myExpenseSum: number = 0;

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

        await this.loadMyGroups(); // Gruppen laden und warten, bis alles geladen ist
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

            // Setze myExpenseSum auf 0, bevor wir die Berechnungen durchführen
            this.myExpenseSum = 0;

            const groupPromises = groups.map(
              (group) =>
                new Promise<void>((resolve) => {
                  this.expenseService.getExpenseByGroup(
                    group.groupId,
                    false,
                    (expenses) => {
                      console.log(
                        `Ausgaben für Gruppe ${group.groupname}:`,
                        expenses
                      );

                      // Berechne die Summe der Ausgaben für diese Gruppe
                      const sumForGroup: number = this.calculateExpenseSum(
                        expenses,
                        uid
                      );

                      // Speichere den Gruppennamen und die Summe in einem neuen Array
                      this.groupExpenses.push({
                        groupName: group.groupname,
                        sum: sumForGroup,
                      });

                      console.log(
                        `Summe für Gruppe "${group.groupname}":`,
                        sumForGroup
                      );

                      // Addiere die Gruppensumme zu myExpenseSum
                      this.myExpenseSum += parseFloat((Math.round(sumForGroup)).toFixed(2));

                      resolve();
                    }
                  );
                })
            );

            await Promise.all(groupPromises);

            // PieChart erstellen mit den gesammelten Gruppensummen
            this.createPieChart();
          }
        );
      }
    } catch (e) {
      console.error('Fehler beim Laden der Gruppen:', e);
    }
  }

  calculateExpenseSum(expenses: Expenses[], uid: string): number {
    let sum = 0;

    expenses.forEach((expense) => {
      sum += expense.expenseMember.reduce((acc, member) => {
        return acc + (member.memberId === uid ? member.amountToPay || 0 : 0);
      }, 0);
    });

    return sum;
  }

  createPieChart() {
    console.log('Erstelle PieChart...', this.groupExpenses);

    const containerWidth = Math.min(window.innerWidth - 20, 500);
    const width = containerWidth;
    const height = containerWidth;
    const radius = (containerWidth / 2) * 0.6; // 70% der halben Breite = großer Kreis

    d3.select('.balance-chart').html('');

    const svg = d3
      .select('.balance-chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeSet3);

    if (this.groupExpenses.length === 0) {
      console.log('Keine Daten für das PieChart verfügbar.');
      return;
    }

    const pie = d3
      .pie<{ groupName: string; sum: number }>()
      .value((d) => d.sum)
      .sort(null);

    const data_ready = pie(this.groupExpenses);

    const arc = d3
      .arc<d3.PieArcDatum<{ groupName: string; sum: number }>>()
      .innerRadius(0)
      .outerRadius(radius);

    const outerArc = d3
      .arc<d3.PieArcDatum<{ groupName: string; sum: number }>>()
      .innerRadius(radius * 1.05) // nur 5% größer als der Kreis
      .outerRadius(radius * 1.05);

    // Pie-Segmente
    svg
      .selectAll('slices')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => color(i.toString())) // Ausgangsfarbe setzen
      .attr('stroke', '#fff')
      .style('stroke-width', '2px')
      .each(function (event, d) {
        // Speichern der Ausgangsfarbe im Element
        d3.select(this).attr(
          'data-original-color',
          d3.select(this).attr('fill')
        );
      })
      .on('mouseover', function (event, d) {
        const currentColor = d3.select(this).attr('data-original-color'); // Hole die gespeicherte Ausgangsfarbe
        const darkerColor = d3.rgb(currentColor).darker(0.2).toString(); // Umwandlung in einen String
        d3.select(this)
          .transition()
          .duration(200) // Dauer der Übergangsanimation
          .attr('fill', darkerColor); // Dunklere Farbe setzen
      })
      .on('mouseout', function (event, d) {
        const originalColor = d3.select(this).attr('data-original-color'); // Hole die gespeicherte Ausgangsfarbe
        d3.select(this)
          .transition()
          .duration(200) // Dauer der Übergangsanimation
          .attr('fill', originalColor); // Rücksetzen der ursprünglichen Farbe
      });

    // Leader Lines
    svg
      .selectAll('allPolylines')
      .data(data_ready)
      .enter()
      .append('polyline')
      .attr('stroke', 'black')
      .style('fill', 'none')
      .attr('stroke-width', 1)
      .attr('points', (d) => {
        const posA = arc.centroid(d);
        const posB = outerArc.centroid(d);
        const posC = [...posB];
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;

        // Verschiebe den Startpunkt der Linie in das äußere Drittel des Arcs
        const offset = radius * 0.33; // Verschiebung im äußeren Drittel (kann angepasst werden)
        posA[0] = posA[0] * (1 + offset / radius); // Position weiter nach außen verschieben
        posA[1] = posA[1] * (1 + offset / radius);

        // Berechne den Endpunkt (verbleibt bei posB und posC)
        posC[0] = radius * 1.05 * (midAngle < Math.PI ? 1 : -1); // nur leicht raus
        return [posA, posB, posC].map((p) => p.join(',')).join(' ');
      });

    svg
      .selectAll('allLabels')
      .data(data_ready)
      .enter()
      .append('text')
      .attr('transform', (d) => {
        const pos = outerArc.centroid(d);
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 1.1 * (midAngle < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .style('text-anchor', (d) => {
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return midAngle < Math.PI ? 'start' : 'end';
      })
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'black')
      .style('alignment-baseline', 'middle')
      .each(function (d) {
        const text = d3.select(this);
        const label = d.data.groupName;
        const myGroupSum = d.data.sum; // Füge den Wert von myGroupSum hinzu

        const words = label.split(' ');
        const lineHeight = 1.2;
        let dy = 0;
        let line = '';
        const maxWidth = radius * 1.2;

        words.forEach((word) => {
          const tempText = text.append('tspan').text(line + word + ' ');
          const textWidth = tempText.node()?.getComputedTextLength();
          tempText.remove();

          if (textWidth && textWidth > maxWidth) {
            text
              .append('tspan')
              .text(line)
              .attr('x', 0)
              .attr('dy', `${dy === 0 ? 0 : lineHeight}em`);
            dy += 1;
            line = word + ' ';
          } else {
            line += word + ' ';
          }
        });

        if (line) {
          text
            .append('tspan')
            .text(line)
            .attr('x', 0)
            .attr('dy', `${dy === 0 ? 0 : lineHeight}em`);
        }

        // Füge myGroupSum als Wert unter dem Gruppennamen hinzu
        if (myGroupSum) {
          // Berechne die Position des Rechtecks basierend auf der Textposition
          const rectWidth = 40; // Breite des Rechtecks
          const rectHeight = 15; // Höhe des Rechtecks
          const rectX = -20; // Horizontale Position (relative Position zur Mitte)
          const rectY = dy * 12; // Vertikale Position, abhängig von der Textzeilenhöhe

          // Füge das Rechteck hinter den Text hinzu
          text
            .append('rect')
            .attr('x', rectX)
            .attr('y', rectY)
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('rx', 5) // Abgerundete Ecken
            .attr('ry', 5) // Abgerundete Ecken
            .style('fill', '#808080'); // Grauer Hintergrund

          // Der Text, der den Wert anzeigt
          text
            .append('tspan')
            .text(`${myGroupSum}€`)
            .attr('x', 0)
            .attr('dy', `${dy * 12 + 1.2}em`) // Position des Texts unterhalb des Rechtecks
            .style('font-size', '10px')
            .style('fill', 'black');
        }
      });

    console.log('PieChart erfolgreich erstellt.');
  }
}
