import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';

@Component({
  selector: 'app-raw-data',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-900 p-4">
      <div class="max-w-full mx-auto">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold text-white">Raw Data</h1>
          <div class="flex gap-2">
            <button (click)="exportCSV()" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md">📥 Export CSV</button>
            <a routerLink="/" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md">← Back</a>
          </div>
        </div>
        
        <!-- Filters -->
        <div class="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label for="startDate" class="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
              <input type="date" id="startDate" [(ngModel)]="startDate" class="bg-slate-700 text-white px-3 py-2 rounded w-full">
            </div>
            <div>
              <label for="endDate" class="block text-sm font-medium text-slate-300 mb-1">End Date</label>
              <input type="date" id="endDate" [(ngModel)]="endDate" class="bg-slate-700 text-white px-3 py-2 rounded w-full">
            </div>
            <div>
              <label for="lineFilter" class="block text-sm font-medium text-slate-300 mb-1">Line</label>
              <select id="lineFilter" [(ngModel)]="selectedLine" class="bg-slate-700 text-white px-3 py-2 rounded w-full">
                <option value="">All Lines</option>
                @for (line of lines(); track line) {
                  <option [value]="line">{{ line }}</option>
                }
              </select>
            </div>
            <div class="flex items-end">
              <button (click)="loadData()" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md w-full">Load Data</button>
            </div>
          </div>
        </div>
        
        <div class="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div class="overflow-x-auto max-h-[70vh]">
            <table class="w-full text-sm text-slate-300">
              <thead class="bg-slate-700 text-xs uppercase sticky top-0">
                <tr>
                  <th class="px-3 py-2">Date</th>
                  <th class="px-3 py-2">Week</th>
                  <th class="px-3 py-2">Area</th>
                  <th class="px-3 py-2">Line</th>
                  <th class="px-3 py-2">Item</th>
                  <th class="px-3 py-2">Plan</th>
                  <th class="px-3 py-2">Actual</th>
                  <th class="px-3 py-2">Unit</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700">
                @for (row of paginatedData(); track row.id) {
                <tr class="hover:bg-slate-700/50">
                  <td class="px-3 py-2">{{ row.date }}</td>
                  <td class="px-3 py-2">{{ row.week }}</td>
                  <td class="px-3 py-2">{{ row.area }}</td>
                  <td class="px-3 py-2 text-xs">{{ row.line }}</td>
                  <td class="px-3 py-2 text-xs">{{ row.item2 }}</td>
                  <td class="px-3 py-2 text-right">{{ row.planQty }}</td>
                  <td class="px-3 py-2 text-right font-bold text-green-400">{{ row.actualQty }}</td>
                  <td class="px-3 py-2">{{ row.unit }}</td>
                </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="flex justify-between items-center mt-4">
          <p class="text-slate-400 text-sm">Hiển thị {{ (currentPage() - 1) * pageSize + 1 }}-{{ Math.min(currentPage() * pageSize, data().length) }} / {{ data().length }} dòng</p>
          <div class="flex gap-2">
            <button (click)="previousPage()" [disabled]="currentPage() === 1" class="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white px-3 py-1 rounded text-sm">← Prev</button>
            <span class="text-white px-3 py-1">Page {{ currentPage() }} / {{ totalPages() }}</span>
            <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" class="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white px-3 py-1 rounded text-sm">Next →</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RawDataComponent implements OnInit {
  private apiService = inject(ApiService);

  data = signal<any[]>([]);
  lines = signal<string[]>([]);
  currentPage = signal<number>(1);
  pageSize = 100;
  Math = Math;
  
  startDate: string;
  endDate: string;
  selectedLine: string = '';
  
  totalPages = computed(() => Math.ceil(this.data().length / this.pageSize));
  paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.data().slice(start, end);
  });

  constructor() {
    const today = new Date();
    this.endDate = this.formatDate(today);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    this.startDate = this.formatDate(oneMonthAgo);
  }

  async ngOnInit() {
    this.loadLines();
    this.loadData();
  }

  async loadLines() {
    try {
      const lines = await this.apiService.getLines();
      this.lines.set(lines);
    } catch (error) {
      console.error('Error loading lines:', error);
    }
  }
  
  async loadData() {
    try {
      const startDate = this.startDate.replace(/-/g, '');
      const endDate = this.endDate.replace(/-/g, '');
      const data = await this.apiService.getRawData(startDate, endDate, this.selectedLine);
      this.data.set(data);
      this.currentPage.set(1);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
  
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }
  
  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }
  
  exportCSV() {
    const headers = ['Date', 'Week', 'Area', 'Line', 'Item', 'Plan', 'Actual', 'Unit'];
    const rows = this.data().map(row => [
      row.date,
      row.week,
      row.area,
      row.line,
      row.item2,
      row.planQty,
      row.actualQty,
      row.unit
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `raw-data-${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
