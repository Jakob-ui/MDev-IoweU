import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonItem, IonList, IonButton, IonIcon, IonLabel, IonBadge,
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
    IonList,
    IonButton,
    IonIcon,
    IonLabel,
    IonBadge,
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
  groupExpenses: { groupId: string; groupName: string; sum: number }[] = [];


  groupId: string | null = '';
  myGroupSum: number = 0;
  myExpenseSum: number = 0;

  showChart = false;

  showCategoryChart = false;
  categoryChartData: { category: string; sum: number }[] = [];
  selectedGroupName: string | null = null;


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

        await this.loadMyGroups();
        this.groupService.getGroupsByUserId(this.uid, (groups) => {
          this.groups = groups;
        });
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
                        groupId: group.groupId,
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

    const isCategoryView = this.showCategoryChart;
    const data = isCategoryView ? this.categoryChartData : this.groupExpenses;

    // Sicherstellen, dass `data` ein Array mit Objekten ist, die eine `sum`-Eigenschaft haben
    if (!Array.isArray(data) || data.some(d => typeof d.sum !== 'number')) {
      console.error('Ungültige Datenstruktur');
      return;
    }

    const containerWidth = Math.min(window.innerWidth - 20, 500);
    const width = containerWidth;
    const height = containerWidth;
    const radius = (containerWidth / 2) * 0.6;

    d3.select('.balance-chart').html('');

    const svg = d3
      .select('.balance-chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeSet3);



    if (data.length === 0) {
      console.log('Keine Daten für das PieChart verfügbar.');
      return;
    }

    const pie = d3
      .pie<{ groupName?: string; category?: string; sum: number }>()
      .value((d) => d.sum)
      .sort(null);

    const filteredData = data.filter(d => d.sum > 0);

    if (filteredData.length === 0) {
      console.log('Keine gültigen (nicht-null) Daten für das PieChart verfügbar.');
      return;
    }

    const data_ready = pie(filteredData);

    const arc = d3
      .arc<d3.PieArcDatum<{ groupName?: string; category?: string; sum: number }>>()
      .innerRadius(0)
      .outerRadius(radius);

    const outerArc = d3
      .arc<d3.PieArcDatum<{ groupName?: string; category?: string; sum: number }>>()
      .innerRadius(radius * 1.05)
      .outerRadius(radius * 1.05);

    // Pie-Segmente mit Klick-Event
    svg
      .selectAll('slices')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => color(i.toString()))
      .attr('stroke', '#fff')
      .style('stroke-width', '2px')
      .each(function (event, d) {
        d3.select(this).attr(
          'data-original-color',
          d3.select(this).attr('fill')
        );
      })
      .on('mouseover', function (event, d) {
        const currentColor = d3.select(this).attr('data-original-color');
        const darkerColor = d3.rgb(currentColor).darker(0.2).toString();
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', darkerColor);
      })
      .on('mouseout', function (event, d) {
        const originalColor = d3.select(this).attr('data-original-color');
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', originalColor);
      })
      .on('click', (event, d) => {
        if (!isCategoryView && d.data.groupName) {
          this.selectedGroupName = d.data.groupName;
          this.loadCategoryBreakdown(d.data.groupName);
        }
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

        const offset = radius * 0.33;
        posA[0] = posA[0] * (1 + offset / radius);
        posA[1] = posA[1] * (1 + offset / radius);

        posC[0] = radius * 1.05 * (midAngle < Math.PI ? 1 : -1);
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
        const label = isCategoryView ? d.data.category || '' : d.data.groupName || '';
        const myGroupSum = d.data.sum;

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

        if (myGroupSum) {
          const rectWidth = 40;
          const rectHeight = 15;
          const rectX = -20;
          const rectY = dy * 12;

          text
            .append('rect')
            .attr('x', rectX)
            .attr('y', rectY)
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('rx', 5)
            .attr('ry', 5)
            .style('fill', '#808080');

          text
            .append('tspan')
            .text(`${myGroupSum}€`)
            .attr('x', 0)
            .attr('dy', `${dy * 12 + 1.2}em`)
            .style('font-size', '10px')
            .style('fill', 'black');
        }
      });

    if (isCategoryView) {
      this.showCategoryChart = true;

      // Button sichtbar machen
      const backButton = document.getElementById('backToGroupsButton');
      if (backButton) {
        backButton.style.display = 'block';  // Button sichtbar machen
      }
    } else {
      // Button ausblenden, wenn nicht in der Kategorienansicht
      const backButton = document.getElementById('backToGroupsButton');
      if (backButton) {
        backButton.style.display = 'none';  // Button unsichtbar machen
      }
    }

    console.log('PieChart erfolgreich erstellt.');
  }


  toggleView() {
    this.showChart = !this.showChart;
    if (this.showChart) {
      // Nur Gruppen mit Summe > 0 anzeigen
      this.groupExpenses = this.groupExpenses.filter((g) => g.sum > 0);
      this.createPieChart(); // wichtig: erneut erzeugen
    }
  }

  goBackToGroups() {
    this.showCategoryChart = false;
    this.selectedGroupName = null;
    this.createPieChart();

    // Button ausblenden
    const backButton = document.getElementById('backToGroupsButton');
    if (backButton) {
      backButton.style.display = 'none';  // Button nach der Aktion wieder unsichtbar machen
    }
  }

  goToGroup(groupId: string) {
    this.navCtrl.navigateRoot('/group/' + groupId);
  }



  loadCategoryBreakdown(groupName: string | null) {
    const group = this.groups.find((g) => g.groupname === groupName);
    if (!group || !this.uid) return;

    this.expenseService.getExpenseByGroup(group.groupId, false, (expenses) => {
      const categoryMap: { [category: string]: number } = {};

      expenses.forEach((expense) => {
        if (!expense.category) {
          console.warn('Expense category is undefined or null:', expense);
          return; // Ignoriere diese Ausgabe, falls keine Kategorie vorhanden ist
        }

        const userPart = expense.expenseMember.find((m) => m.memberId === this.uid);
        if (userPart && userPart.amountToPay) {
          categoryMap[expense.category] = (categoryMap[expense.category] || 0) + userPart.amountToPay;
        }
      });

      this.categoryChartData = Object.entries(categoryMap).map(([category, sum]) => ({
        category,
        sum,
      }));

      this.showCategoryChart = true;
      this.createPieChart();
    });
  }

}
