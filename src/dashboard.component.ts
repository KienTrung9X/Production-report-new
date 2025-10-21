import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, signal, viewChild, effect, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart } from 'chart.js/auto';
import { ApiService } from './api.service';
import { processProductionData, ProductionLine, DailyProd } from './production-processor';
import { processRawData, RawDataItem, ProcessedLine } from './data-processor';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block min-h-screen p-4 sm:p-8 text-slate-200',
  },
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  private apiService = inject(ApiService);
  
  // Signals for chart elements
  dailyPerformanceCanvas = viewChild<ElementRef>('dailyPerformanceChart');
  totalOutputCanvas = viewChild<ElementRef>('totalOutputChart');
  avgPerformanceCanvas = viewChild<ElementRef>('avgPerformanceChart');
  areaProportionCanvas = viewChild<ElementRef>('areaProportionChart');
  monthlyTrendCanvas = viewChild<ElementRef>('monthlyTrendChart');

  // Chart instances
  private dailyPerformanceChart?: Chart;
  private totalOutputChart?: Chart;
  private avgPerformanceChart?: Chart;
  private areaProportionChart?: Chart;
  private monthlyTrendChart?: Chart;

  // Filter signals
  fiscalYear = signal<string>(this.getCurrentFiscalYear());
  monthOptions: string[] = this.getInitialMonthOptions();
  selectedMonth = signal<string>(this.getInitialMonth());
  selectedWeek = signal<number>(0);
  
  private getCurrentFiscalYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const fiscalYear = `${year}-${year + 1}`;
    console.log('getCurrentFiscalYear:', fiscalYear);
    return fiscalYear;
  }
  
  private getInitialMonthOptions(): string[] {
    const now = new Date();
    const year = now.getFullYear();
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, now.getMonth() + i, 1);
      months.push(`${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    }
    return months;
  }
  
  private getInitialMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedArea = signal<string>('Sewing');
  selectedMachineGroup = signal<string>('All');

  // Data signals
  rawDates = signal<string[]>([]);
  dates = computed(() => this.rawDates().map(d => `${d.slice(4, 6)}/${d.slice(6, 8)}`));
  
  displayedDates = computed(() => {
    const startDate = this.startDate();
    const endDate = this.endDate();
    const allDates = this.dates();
    const rawDates = this.rawDates();
    
    console.log('Computing displayedDates:', { startDate, endDate, allDates, rawDates });
    
    if (!startDate || !endDate || !rawDates.length) {
      console.log('Returning all dates due to missing filters or data');
      return allDates;
    }
    
    const startDateNum = parseInt(startDate.replace(/-/g, ''));
    const endDateNum = parseInt(endDate.replace(/-/g, ''));
    
    const filteredDates = rawDates.filter(d => {
      const dateNum = parseInt(d);
      return dateNum >= startDateNum && dateNum <= endDateNum;
    });
    
    const displayDates = filteredDates.map(d => `${d.slice(4, 6)}/${d.slice(6, 8)}`);
    console.log('Filtered displayed dates:', displayDates);
    
    return displayDates;
  });

  // Week options computed
  weeks = computed(() => {
    const month = this.selectedMonth();
    if (!month) return [];
    
    const year = parseInt(month.substring(0, 4));
    const monthNum = parseInt(month.substring(4, 6)) - 1;
    
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);
    
    // Find first Monday
    const firstMonday = new Date(firstDay);
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1);
    }

    const weeks: {value: number, label: string}[] = [{value: 0, label: 'All'}];
    let currentWeek = 1;
    let currentDate = new Date(firstMonday);

    while (currentDate <= lastDay) {
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const actualWeekEnd = weekEnd > lastDay ? lastDay : weekEnd;
      
      weeks.push({
        value: currentWeek,
        label: `Week ${currentWeek}: ${this.formatWeekDisplay(currentDate, actualWeekEnd)}`
      });
      
      currentDate.setDate(currentDate.getDate() + 7);
      currentWeek++;
    }

    return weeks;
  });

  constructor() {
    this.updateMonthOptions();
    
    const currentMonth = this.getCurrentMonth();
    if (this.monthOptions.includes(currentMonth)) {
      this.selectedMonth.set(currentMonth);
    } else {
      this.selectedMonth.set(this.monthOptions[this.monthOptions.length - 1]);
    }
    
    setTimeout(() => {
      this.selectedWeek.set(this.getCurrentWeek());
    }, 0);

    // Update month options when fiscal year changes
    effect(() => {
      const _ = this.fiscalYear();
      this.updateMonthOptions();
      const currentMonth = this.getCurrentMonth();
      if (this.monthOptions.includes(currentMonth)) {
        this.selectedMonth.set(currentMonth);
      } else {
        this.selectedMonth.set(this.monthOptions[this.monthOptions.length - 1]);
      }
    });

    effect(() => {
      const month = this.selectedMonth();
      const selectedWeek = this.selectedWeek();
      
      if (!month) return;
      
      const year = month.substring(0, 4);
      const monthNum = month.substring(4, 6);
      
      console.log('Calculating date range for month:', month, 'week:', selectedWeek);
      
      if (selectedWeek === 0) {
        // Full month
        const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
        const newStartDate = `${year}-${monthNum}-01`;
        const newEndDate = `${year}-${monthNum}-${lastDay.toString().padStart(2, '0')}`;
        console.log('Setting full month range:', newStartDate, 'to', newEndDate);
        this.startDate.set(newStartDate);
        this.endDate.set(newEndDate);
      } else {
        // Specific week - use simple date calculation
        const startDay = 1 + (selectedWeek - 1) * 7;
        const endDay = Math.min(startDay + 6, new Date(parseInt(year), parseInt(monthNum), 0).getDate());
        
        const newStartDate = `${year}-${monthNum}-${startDay.toString().padStart(2, '0')}`;
        const newEndDate = `${year}-${monthNum}-${endDay.toString().padStart(2, '0')}`;
        console.log('Setting week range:', newStartDate, 'to', newEndDate);
        this.startDate.set(newStartDate);
        this.endDate.set(newEndDate);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const start = this.startDate();
      const end = this.endDate();
      console.log('Date range changed:', start, 'to', end);
      if (start && end) {
        console.log('Triggering loadData due to date change');
        this.loadData();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const _ = this.selectedArea();
      const __ = this.selectedMachineGroup();
      this.updateCurrentAreaData();
      setTimeout(() => this.createCharts(), 0);
    }, { allowSignalWrites: true });
    
    effect(() => {
      const currentData = this.currentAreaData();
      const displayDates = this.displayedDates();
      console.log('Current area data or displayed dates changed:', {
        dataLength: currentData.length,
        datesLength: displayDates.length,
        selectedArea: this.selectedArea(),
        selectedGroup: this.selectedMachineGroup()
      });
      setTimeout(() => this.createCharts(), 0);
    }, { allowSignalWrites: true });
  }

  updateMonthOptions() {
    const now = new Date();
    const year = now.getFullYear();
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, now.getMonth() + i, 1);
      months.push(`${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    }
    this.monthOptions = months;
  }

  formatMonthDisplay(month: string): string {
    return month.substring(0, 4) + '/' + month.substring(4, 6);
  }

  formatWeekDisplay(startDate: Date, endDate: Date): string {
    const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
    const startDay = startDate.getDate().toString().padStart(2, '0');
    const endDay = endDate.getDate().toString().padStart(2, '0');
    return `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
  }

  getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
  }

  getCurrentWeek(): number {
    const now = new Date();
    const month = this.selectedMonth();
    if (!month) return 0;
    
    const year = parseInt(month.substring(0, 4));
    const monthNum = parseInt(month.substring(4, 6)) - 1;
    
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);
    
    const firstMonday = new Date(firstDay);
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1);
    }
    
    if (now < firstMonday || now > lastDay) return 0;
    
    const diffDays = Math.floor((now.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  }

  showMessage = signal(false);
  loadingMessage = signal('');
  fiscalYearOptions = this.generateFiscalYearOptions();
  
  private generateFiscalYearOptions(): string[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const options = [
      `${currentYear - 1}-${currentYear}`,
      `${currentYear}-${currentYear + 1}`,
      `${currentYear + 1}-${currentYear + 2}`
    ];
    console.log('generateFiscalYearOptions:', options);
    return options;
  }
  areaList = ['All', 'Weaving', 'Knitcord', 'Forming', 'Sewing', 'Heatset', 'SPCH'];
  currentAreaData = signal<ProcessedLine[]>([]);
  allData = signal<any>(null);
  areaItemsMap = signal<{ [area: string]: string[] }>({});
  
  machineGroups = computed(() => {
    const area = this.selectedArea();
    if (area === 'All') return ['All'];
    const items = this.areaItemsMap()[area] || [];
    return ['All', ...items.sort()];
  });

  async loadData() {
    const startDate = this.startDate();
    const endDate = this.endDate();
    
    if (!startDate || !endDate) {
      console.log('No date range set, skipping load');
      return;
    }
    
    try {
      console.log('Loading data for date range:', startDate, 'to', endDate);
      const response = await fetch('/production-data.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawData: RawDataItem[] = await response.json();
      console.log('Raw data loaded:', rawData.length, 'records');
      
      if (!rawData || rawData.length === 0) {
        console.warn('No raw data available');
        this.allData.set({});
        this.currentAreaData.set([]);
        return;
      }
      
      const processed = processRawData(rawData, startDate, endDate);
      console.log('Processed data:', processed);
      console.log('Processed dates:', processed.dates);
      this.rawDates.set(processed.dates);
      
      const areaData: any = {
        'Weaving': processed.Weaving || [],
        'Knitcord': processed.Knitcord || [],
        'Forming': processed.Forming || [],
        'Sewing': processed.Sewing || [],
        'Heatset': processed.Heatset || [],
        'SPCH': processed.SPCH || []
      };
      
      console.log('Area data counts:', {
        Weaving: areaData.Weaving.length,
        Knitcord: areaData.Knitcord.length,
        Forming: areaData.Forming.length,
        Sewing: areaData.Sewing.length,
        Heatset: areaData.Heatset.length,
        SPCH: areaData.SPCH.length
      });
      
      this.allData.set(areaData);
      this.areaItemsMap.set(processed.areaItems);
      this.updateCurrentAreaData();
      console.log('Current area data length:', this.currentAreaData().length);
    } catch (error) {
      console.error('Error loading data:', error);
      this.allData.set({});
      this.currentAreaData.set([]);
    }
  }

  async loadDataFromSQL() {
    this.showMessage.set(true);
    this.loadingMessage.set('⏳ Connecting to AS/400...');
    try {
      const healthy = await this.apiService.checkHealth();
      if (!healthy) {
        this.loadingMessage.set('❌ Backend server not running. Please start START_BACKEND.bat');
        setTimeout(() => this.showMessage.set(false), 5000);
        return;
      }
      
      this.loadingMessage.set('⏳ Loading data from AS/400...');
      const result = await this.apiService.getProductionData(this.startDate(), this.endDate(), true);
      if (result.error) {
        this.loadingMessage.set('❌ ' + result.error);
      } else {
        this.loadingMessage.set('✅ Loaded ' + (result.saved || 0) + ' records successfully');
        await this.loadData();
        setTimeout(() => this.createCharts(), 0);
      }
    } catch (error: any) {
      this.loadingMessage.set('❌ Error: ' + (error.message || 'Unknown error'));
    }
    setTimeout(() => this.showMessage.set(false), 5000);
  }

  updateCurrentAreaData() {
    const area = this.selectedArea();
    const group = this.selectedMachineGroup();
    const data = this.allData();
    
    console.log('updateCurrentAreaData:', { area, group, hasData: !!data });
    
    if (!data) {
      this.currentAreaData.set([]);
      return;
    }

    if (area === 'All') {
      const allLines: ProcessedLine[] = [];
      Object.values(data).forEach((areaData: any) => {
        if (Array.isArray(areaData)) allLines.push(...areaData);
      });
      this.currentAreaData.set(allLines);
    } else {
      let areaData = data[area] || [];
      if (group !== 'All') {
        areaData = areaData.filter((line: ProcessedLine) => line.machineGroup === group);
      }
      this.currentAreaData.set(areaData);
    }
    console.log('Updated currentAreaData:', this.currentAreaData().length, 'lines');
  }

  ngAfterViewInit() {
    // Load initial data
    this.loadData();
    setTimeout(() => this.createCharts(), 100);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  createCharts() {
    console.log('Creating charts...');
    this.destroyCharts();
    
    const data = this.currentAreaData();
    const dates = this.displayedDates();
    
    console.log('Chart data:', { dataLength: data.length, datesLength: dates.length });
    
    if (!data.length || !dates.length) {
      console.log('No data or dates available for charts');
      return;
    }
    
    try {
      // Chart 1: Daily Performance
      this.createDailyPerformanceChart(data, dates);
      
      // Chart 2: Total Output by Machine Group
      this.createTotalOutputChart(data);
      
      // Chart 3: Average Performance
      this.createAvgPerformanceChart(data);
      
      // Chart 4: Area Proportion
      this.createAreaProportionChart();
      
      // Chart 5: Monthly Trend
      this.createMonthlyTrendChart(data, dates);
      
      console.log('Charts created successfully');
    } catch (error) {
      console.error('Error creating charts:', error);
    }
  }
  
  private createDailyPerformanceChart(data: ProcessedLine[], dates: string[]) {
    const canvas = this.dailyPerformanceCanvas()?.nativeElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dailyPercentages = dates.map((_, index) => {
      const dayTotal = this.getDailyTotal(data, index);
      return dayTotal.plan > 0 ? (dayTotal.act / dayTotal.plan) * 100 : 0;
    });
    
    this.dailyPerformanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Performance %',
          data: dailyPercentages,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e2e8f0' } }
        },
        scales: {
          x: { ticks: { color: '#e2e8f0' }, grid: { color: '#374151' } },
          y: { ticks: { color: '#e2e8f0' }, grid: { color: '#374151' } }
        }
      }
    });
  }
  
  private createTotalOutputChart(data: ProcessedLine[]) {
    const canvas = this.totalOutputCanvas()?.nativeElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const machineGroups = [...new Set(data.map(line => line.machineGroup))];
    const planData = machineGroups.map(group => {
      return data.filter(line => line.machineGroup === group)
        .reduce((sum, line) => sum + this.getLineTotal(line).plan, 0);
    });
    const actData = machineGroups.map(group => {
      return data.filter(line => line.machineGroup === group)
        .reduce((sum, line) => sum + this.getLineTotal(line).act, 0);
    });
    
    this.totalOutputChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: machineGroups,
        datasets: [
          {
            label: 'Plan',
            data: planData,
            backgroundColor: 'rgba(59, 130, 246, 0.7)'
          },
          {
            label: 'Actual',
            data: actData,
            backgroundColor: 'rgba(34, 197, 94, 0.7)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e2e8f0' } }
        },
        scales: {
          x: { ticks: { color: '#e2e8f0' }, grid: { color: '#374151' } },
          y: { ticks: { color: '#e2e8f0' }, grid: { color: '#374151' } }
        }
      }
    });
  }
  
  private createAvgPerformanceChart(data: ProcessedLine[]) {
    const canvas = this.avgPerformanceCanvas()?.nativeElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const linePerformances = data.map(line => {
      const total = this.getLineTotal(line);
      return {
        name: line.name,
        performance: total.plan > 0 ? (total.act / total.plan) * 100 : 0
      };
    }).sort((a, b) => b.performance - a.performance);
    
    this.avgPerformanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: linePerformances.map(item => item.name),
        datasets: [{
          label: 'Performance %',
          data: linePerformances.map(item => item.performance),
          backgroundColor: linePerformances.map(item => 
            item.performance >= 100 ? 'rgba(34, 197, 94, 0.7)' :
            item.performance >= 90 ? 'rgba(251, 191, 36, 0.7)' :
            'rgba(239, 68, 68, 0.7)'
          )
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { labels: { color: '#e2e8f0' } }
        },
        scales: {
          x: { ticks: { color: '#e2e8f0' }, grid: { color: '#374151' } },
          y: { ticks: { color: '#e2e8f0' }, grid: { color: '#374151' } }
        }
      }
    });
  }
  
  private createAreaProportionChart() {
    const canvas = this.areaProportionCanvas()?.nativeElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const allData = this.allData();
    if (!allData) return;
    
    const areaData = Object.entries(allData).map(([area, lines]: [string, any]) => {
      const total = lines.reduce((sum: number, line: ProcessedLine) => 
        sum + this.getLineTotal(line).act, 0);
      return { area, total };
    }).filter(item => item.total > 0);
    
    this.areaProportionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: areaData.map(item => item.area),
        datasets: [{
          data: areaData.map(item => item.total),
          backgroundColor: [
            '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            labels: { color: '#e2e8f0' },
            position: 'bottom'
          }
        }
      }
    });
  }
  
  private createMonthlyTrendChart(data: ProcessedLine[], dates: string[]) {
    const canvas = this.monthlyTrendCanvas()?.nativeElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dailyPercentages = dates.map((_, index) => {
      const dayTotal = this.getDailyTotal(data, index);
      return dayTotal.plan > 0 ? (dayTotal.act / dayTotal.plan) * 100 : 0;
    });
    
    this.monthlyTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Daily Performance %',
            data: dailyPercentages,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Target (100%)',
            data: new Array(dates.length).fill(100),
            borderColor: '#ef4444',
            borderDash: [5, 5],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e2e8f0' } }
        },
        scales: {
          x: { ticks: { color: '#e2e8f0' }, grid: { color: '#374151' } },
          y: { ticks: { color: '#e2e8f0' }, grid: { color: '#374151' } }
        }
      }
    });
  }

  destroyCharts() {
    this.dailyPerformanceChart?.destroy();
    this.totalOutputChart?.destroy();
    this.avgPerformanceChart?.destroy();
    this.areaProportionChart?.destroy();
    this.monthlyTrendChart?.destroy();
  }

  updateAllCharts() {
    this.updateCurrentAreaData();
    setTimeout(() => this.createCharts(), 0);
  }

  getOverallTotal(data: ProcessedLine[]) {
    return data.reduce((acc, line) => {
      const lineTotal = this.getLineTotal(line);
      return {
        plan: acc.plan + lineTotal.plan,
        act: acc.act + lineTotal.act
      };
    }, { plan: 0, act: 0 });
  }

  getLineTotal(line: ProcessedLine) {
    return {
      plan: line.data?.reduce((sum, d) => sum + (d.plan || 0), 0) || 0,
      act: line.data?.reduce((sum, d) => sum + (d.act || 0), 0) || 0
    };
  }

  getDailyTotal(data: ProcessedLine[], dayIndex: number) {
    return data.reduce((acc, line) => {
      const day = line.data?.[dayIndex];
      return {
        plan: acc.plan + (day?.plan || 0),
        act: acc.act + (day?.act || 0)
      };
    }, { plan: 0, act: 0 });
  }

  getMonthlyPlan(line: ProcessedLine): number {
    return line.monthlyPlan || 0;
  }

  getMonthlyAct(line: ProcessedLine): number {
    return line.monthlyAct || 0;
  }

  getTotalMonthlyPlan(data: ProcessedLine[]): number {
    return data.reduce((sum, line) => sum + (line.monthlyPlan || 0), 0);
  }

  getTotalMonthlyAct(data: ProcessedLine[]): number {
    return data.reduce((sum, line) => sum + (line.monthlyAct || 0), 0);
  }

  getPercentage(actual: number, planned: number): number {
    return planned === 0 ? 0 : (actual / planned) * 100;
  }

  formatNumber(value: number): string {
    return value.toLocaleString();
  }

  formatAct(value: number): string {
    return value.toLocaleString();
  }

  formatPercent(value: number): string {
    return value.toFixed(1) + '%';
  }
  
  debugCurrentState() {
    console.log('=== DEBUG CURRENT STATE ===');
    console.log('Selected Month:', this.selectedMonth());
    console.log('Selected Week:', this.selectedWeek());
    console.log('Start Date:', this.startDate());
    console.log('End Date:', this.endDate());
    console.log('Selected Area:', this.selectedArea());
    console.log('Selected Machine Group:', this.selectedMachineGroup());
    console.log('Raw Dates:', this.rawDates());
    console.log('Displayed Dates:', this.displayedDates());
    console.log('Current Area Data Length:', this.currentAreaData().length);
    console.log('All Data:', this.allData());
    console.log('Area Items Map:', this.areaItemsMap());
    console.log('=== END DEBUG ===');
  }
}