/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, signal, viewChild, effect } from '@angular/core';
import { Chart } from 'chart.js/auto';

export interface DailyProd {
  plan: number;
  act: number | null;
}

export interface ProductionLine {
  name: string;
  data: DailyProd[];
}

export interface FormingElement {
  element: string;
  itemCode: string;
  dailyProd: (number | null)[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block min-h-screen p-4 sm:p-8 text-slate-200',
  },
})
export class AppComponent implements AfterViewInit, OnDestroy {
  dates = ['6/10', '7/10', '8/10', '9/10', '10/10'];

  sewingLines = signal<ProductionLine[]>([
    {
      name: '03 CF CHAIN PB12 NAT',
      data: [
        { plan: 100, act: 150 },
        { plan: 100, act: 160 },
        { plan: 100, act: 170 },
        { plan: 100, act: 165 },
        { plan: 100, act: 170 },
      ],
    },
    {
      name: '05 CI CHAIN PB16 NAT',
      data: [
        { plan: 120, act: 135 },
        { plan: 120, act: 140 },
        { plan: 120, act: 145 },
        { plan: 120, act: 150 },
        { plan: 120, act: 130 },
      ],
    },
    {
      name: '45 CF CHAIN PB14 NAT',
      data: [
        { plan: 150, act: 160 },
        { plan: 150, act: 170 },
        { plan: 150, act: 165 },
        { plan: 150, act: 175 },
        { plan: 150, act: 160 },
      ],
    },
    {
      name: 'Special Chain',
      data: [
        { plan: 200, act: 180 },
        { plan: 200, act: 175 },
        { plan: 200, act: 190 },
        { plan: 200, act: 185 },
        { plan: 200, act: 160 },
      ],
    },
     {
      name: 'Missing Data Line',
      data: [
        { plan: 80, act: 85 },
        { plan: 80, act: 90 },
        { plan: 80, act: 80 },
        { plan: 80, act: 88 },
        { plan: 80, act: null },
      ],
    },
  ]);

  formingData = signal<FormingElement[]>([
      { element: 'EP050', itemCode: '6815518', dailyProd: [1200, 1250, 1300, 1150, 1180] },
      { element: 'EP060', itemCode: '8284071', dailyProd: [850, 880, 900, 860, 870] },
      { element: 'EP074', itemCode: '7432910', dailyProd: [2100, 2150, 2200, 2050, null] },
  ]);

  // Chart instances
  dailyPerformanceChart: Chart | undefined;
  totalOutputChart: Chart | undefined;
  avgPerformanceChart: Chart | undefined;
  areaProportionChart: Chart | undefined;
  monthlyTrendChart: Chart | undefined;

  // Canvas element references
  dailyPerformanceCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('dailyPerformanceChart');
  totalOutputCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('totalOutputChart');
  avgPerformanceCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('avgPerformanceChart');
  areaProportionCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('areaProportionChart');
  monthlyTrendCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('monthlyTrendChart');

  constructor() {
    effect(() => {
      // This effect runs when signals change, triggering chart updates.
      // The check for chart instances ensures we don't try to update before creation.
      if (this.dailyPerformanceChart) {
          this.updateAllCharts();
      }
    });
  }
  
  ngAfterViewInit(): void {
    this.setChartDefaults();
    this.createAllCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  setChartDefaults(): void {
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.color = '#cbd5e1'; // slate-300
    Chart.defaults.borderColor = '#475569'; // slate-600
    Chart.defaults.plugins.legend.position = 'bottom';
  }

  createAllCharts(): void {
    this.createDailyPerformanceChart();
    this.createTotalOutputChart();
    this.createAvgPerformanceChart();
    this.createAreaProportionChart();
    this.createMonthlyTrendChart();
  }

  updateAllCharts(): void {
    const dailyPerfData = this.getDailyPerformanceData();
    if (this.dailyPerformanceChart) {
      this.dailyPerformanceChart.data.datasets = dailyPerfData.datasets;
      this.dailyPerformanceChart.update('none');
    }
    if (this.monthlyTrendChart) {
      this.monthlyTrendChart.data.datasets = dailyPerfData.datasets;
      this.monthlyTrendChart.update('none');
    }

    if (this.totalOutputChart) {
      const { labels, datasets } = this.getTotalOutputData();
      this.totalOutputChart.data.labels = labels;
      this.totalOutputChart.data.datasets = datasets;
      this.totalOutputChart.update('none');
    }
    
    if (this.avgPerformanceChart) {
      const { labels, datasets } = this.getAvgPerformanceData();
      this.avgPerformanceChart.data.labels = labels;
      this.avgPerformanceChart.data.datasets = datasets;
      this.avgPerformanceChart.update('none');
    }

    if (this.areaProportionChart) {
        const { datasets } = this.getAreaProportionData();
        this.areaProportionChart.data.datasets = datasets;
        this.areaProportionChart.update('none');
    }
  }

  // --- Chart Data Preparation ---

  private getDailyPerformanceData() {
    const labels = this.dates;
    const colors = ['#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];

    const datasets = this.sewingLines().map((line, index) => ({
      label: line.name.split(' ').slice(0, 2).join(' '),
      data: line.data.map(d => this.getPercentage(d.act, d.plan)),
      backgroundColor: colors[index % colors.length] + '80',
      borderColor: colors[index % colors.length],
      borderWidth: 2,
      fill: false,
      tension: 0.1
    }));
    return { labels, datasets };
  }

  private getTotalOutputData() {
    const labels = this.sewingLines().map(l => l.name.split(' ').slice(0, 2).join(' '));
    const datasets = [
      {
        label: 'Plan',
        data: this.sewingLines().map(l => this.getLineTotal(l).plan),
        backgroundColor: '#3b82f680',
        borderColor: '#2563eb',
        borderWidth: 1,
      },
      {
        label: 'Act',
        data: this.sewingLines().map(l => this.getLineTotal(l).act ?? 0),
        backgroundColor: '#22c55e80',
        borderColor: '#16a34a',
        borderWidth: 1,
      },
    ];
    return { labels, datasets };
  }

  private getAvgPerformanceData() {
    const sortedLines = [...this.sewingLines()].sort((a, b) => 
        (this.getPercentage(this.getLineTotal(b).act, this.getLineTotal(b).plan) ?? 0) -
        (this.getPercentage(this.getLineTotal(a).act, this.getLineTotal(a).plan) ?? 0)
    );
    const labels = sortedLines.map(l => l.name);
    const data = sortedLines.map(l => this.getPercentage(this.getLineTotal(l).act, this.getLineTotal(l).plan));
    
    const datasets = [{
      label: 'Average Weekly Performance %',
      data,
      backgroundColor: data.map(p => (p ?? 0) >= 100 ? '#22c55e80' : (p ?? 0) >= 90 ? '#eab30880' : '#ef444480'),
      borderColor: data.map(p => (p ?? 0) >= 100 ? '#16a34a' : (p ?? 0) >= 90 ? '#d97706' : '#dc2626'),
      borderWidth: 1,
    }];
    return { labels, datasets };
  }
  
  private getAreaProportionData() {
    const sewingTotal = this.getOverallTotal().act ?? 0;
    const formingTotal = this.formingData().reduce((total, item) => total + this.getFormingTotal(item), 0);
    return {
      datasets: [{
        label: 'Production Total',
        data: [sewingTotal, formingTotal],
        backgroundColor: ['#3b82f6', '#8b5cf6'],
        hoverOffset: 8,
      }]
    };
  }

  // --- Chart Creation Methods ---

  private createDailyPerformanceChart(): void {
    const { labels, datasets } = this.getDailyPerformanceData();
    this.dailyPerformanceChart = new Chart(this.dailyPerformanceCanvas().nativeElement, {
      type: 'bar',
      data: { labels, datasets },
      options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Performance (%)' } } } }
    });
  }

  private createTotalOutputChart(): void {
    const { labels, datasets } = this.getTotalOutputData();
    this.totalOutputChart = new Chart(this.totalOutputCanvas().nativeElement, {
      type: 'bar',
      data: { labels, datasets },
      options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Quantity Produced' } } } }
    });
  }

  private createAvgPerformanceChart(): void {
    const { labels, datasets } = this.getAvgPerformanceData();
    this.avgPerformanceChart = new Chart(this.avgPerformanceCanvas().nativeElement, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        indexAxis: 'y',
        scales: { x: { beginAtZero: true, title: { display: true, text: 'Average Performance (%)' } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  private createAreaProportionChart(): void {
    const { datasets } = this.getAreaProportionData();
    this.areaProportionChart = new Chart(this.areaProportionCanvas().nativeElement, {
      type: 'doughnut',
      data: { labels: ['Sewing (pcs)', 'Forming (Kg)'], datasets }
    });
  }
  
  private createMonthlyTrendChart(): void {
    const { labels, datasets } = this.getDailyPerformanceData();
    this.monthlyTrendChart = new Chart(this.monthlyTrendCanvas().nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: { scales: { y: { beginAtZero: false, title: { display: true, text: 'Performance (%)' } } } }
    });
  }

  private destroyCharts(): void {
    this.dailyPerformanceChart?.destroy();
    this.totalOutputChart?.destroy();
    this.avgPerformanceChart?.destroy();
    this.areaProportionChart?.destroy();
    this.monthlyTrendChart?.destroy();
  }

  // --- Data Calculation Methods ---

  getPercentage(act: number | null, plan: number): number | null {
    if (act === null || plan === 0) return null;
    return Math.round((act / plan) * 100);
  }

  getLineTotal(line: ProductionLine): DailyProd {
    return line.data.reduce((acc, day) => {
      acc.plan += day.plan;
      acc.act = (acc.act ?? 0) + (day.act ?? 0);
      return acc;
    }, { plan: 0, act: 0 } as DailyProd);
  }

  getDailyTotal(dayIndex: number): DailyProd {
     return this.sewingLines().reduce((acc, line) => {
      const day = line.data[dayIndex];
      if (day) {
        acc.plan += day.plan;
        acc.act = (acc.act ?? 0) + (day.act ?? 0);
      }
      return acc;
    }, { plan: 0, act: 0 } as DailyProd);
  }

  getOverallTotal(): DailyProd {
    return this.sewingLines().reduce((acc, line) => {
      const lineTotal = this.getLineTotal(line);
      acc.plan += lineTotal.plan;
      acc.act = (acc.act ?? 0) + (lineTotal.act ?? 0);
      return acc;
    }, { plan: 0, act: 0 } as DailyProd);
  }

  getFormingTotal(item: FormingElement): number {
    return item.dailyProd.reduce((sum, current) => sum + (current ?? 0), 0);
  }
}