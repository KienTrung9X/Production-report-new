import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface MonthlyPlan {
  itemCode: string;
  item1: string;
  area: string;
  plans: { [month: string]: number };
}

interface WorkDays {
  month: string;
  days: number;
}

@Component({
  selector: 'app-plan-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './plan-entry.html',
  styleUrls: ['./plan-entry.css']
})
export class PlanEntryComponent {
  months: string[];
  monthNames: { [key: string]: string } = {};
  workDays = signal<{ [month: string]: number }>({});

  constructor() {
    const now = new Date();
    const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    this.months = [];
    const defaultWorkDays: { [month: string]: number } = {};
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      this.months.push(monthKey);
      this.monthNames[monthKey] = `${monthAbbr[date.getMonth()]} ${date.getFullYear()}`;
      defaultWorkDays[monthKey] = 22;
    }
    
    this.workDays.set(defaultWorkDays);
  }
  editingWorkDays = signal<boolean>(false);
  areas = ['111', '121', '161', '312', '313', '315'];
  areaNames: { [key: string]: string } = {
    '111': 'Weaving',
    '121': 'Knitcord',
    '161': 'Heatset',
    '312': 'Forming',
    '313': 'Sewing',
    '315': 'SPCH'
  };
  items = signal<MonthlyPlan[]>([]);
  selectedArea = signal<string>('111');
  selectedItem = signal<MonthlyPlan | null>(null);
  showAddForm = signal<boolean>(false);
  editingItem = signal<MonthlyPlan | null>(null);
  newItem = signal<{ itemCode: string; item1: string; area: string }>({
    itemCode: '',
    item1: '',
    area: '111'
  });
  
  filteredItems = computed(() => 
    this.items().filter(item => item.area === this.selectedArea())
  );

  getAreaItemCount(area: string): number {
    return this.items().filter(i => i.area === area).length;
  }

  formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  getTotalWorkDays(): number {
    return Object.values(this.workDays()).reduce((sum, days) => sum + days, 0);
  }

  getTotalPlan(item: MonthlyPlan): number {
    return Object.values(item.plans).reduce((sum, val) => sum + (val || 0), 0);
  }

  getDailyAvg(item: MonthlyPlan, month: string): number {
    const plan = item.plans[month] || 0;
    const days = this.workDays()[month] || 1;
    return Math.round(plan / days);
  }

  getOverallDailyAvg(item: MonthlyPlan): number {
    const totalPlan = this.getTotalPlan(item);
    const totalDays = this.getTotalWorkDays();
    return Math.round(totalPlan / totalDays);
  }

  getUnit(item: MonthlyPlan): string {
    // 121 (Knitcord) và 312 (Forming) dùng kg, còn lại dùng md
    return (item.area === '121' || item.area === '312') ? 'kg' : 'md';
  }
  
  ngOnInit() {
    console.log('PlanEntryComponent initialized');
    this.loadPlans();
  }

  async loadPlans() {
    try {
      const saved = localStorage.getItem('monthly-plans');
      if (saved) {
        const data = JSON.parse(saved);
        console.log('Loaded from localStorage:', data.length, 'items');
        console.log('Sample item:', data[0]);
        this.items.set(data);
      } else {
        console.log('Loading from productionPlanData.json...');
        const response = await fetch('productionPlanData.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Loaded from JSON:', data.length, 'items');
        console.log('Sample raw item:', data[0]);
        const formatted = data.map((item: any) => ({
          itemCode: item.itemCode,
          item1: item.item1,
          area: item.line1,
          plans: item.plans || {}
        }));
        console.log('Sample formatted item:', formatted[0]);
        this.items.set(formatted);
      }
      
      const savedWorkDays = localStorage.getItem('work-days');
      if (savedWorkDays) {
        this.workDays.set(JSON.parse(savedWorkDays));
      }
      
      console.log('Final items count:', this.items().length);
      console.log('Areas found:', [...new Set(this.items().map(i => i.area))]);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  }

  selectArea(area: string) {
    this.selectedArea.set(area);
    this.selectedItem.set(null);
  }

  selectItem(item: MonthlyPlan) {
    this.selectedItem.set({...item, plans: {...item.plans}});
  }

  updatePlan(month: string, value: number) {
    const item = this.selectedItem();
    if (item) {
      item.plans[month] = value;
    }
  }

  savePlan() {
    const item = this.selectedItem();
    if (item) {
      const index = this.items().findIndex(i => i.itemCode === item.itemCode && i.area === item.area);
      if (index !== -1) {
        const updated = [...this.items()];
        updated[index] = item;
        this.items.set(updated);
        localStorage.setItem('monthly-plans', JSON.stringify(updated));
        alert('Plan saved successfully!');
      }
    }
  }

  saveWorkDays() {
    localStorage.setItem('work-days', JSON.stringify(this.workDays()));
    this.editingWorkDays.set(false);
    alert('Work days saved successfully!');
  }

  updateWorkDays(month: string, value: number) {
    const updated = {...this.workDays()};
    updated[month] = value;
    this.workDays.set(updated);
  }

  addNewItem() {
    const item = this.newItem();
    if (!item.itemCode || !item.item1) {
      alert('Please fill in Item Code and Item Name');
      return;
    }
    const newPlan: MonthlyPlan = {
      itemCode: item.itemCode,
      item1: item.item1,
      area: item.area,
      plans: {}
    };
    const updated = [...this.items(), newPlan];
    this.items.set(updated);
    localStorage.setItem('monthly-plans', JSON.stringify(updated));
    this.newItem.set({ itemCode: '', item1: '', area: '111' });
    this.showAddForm.set(false);
    this.selectItem(newPlan);
    alert('Item added successfully!');
  }

  updateNewItemCode(value: string) {
    this.newItem.set({ ...this.newItem(), itemCode: value });
  }

  updateNewItemName(value: string) {
    this.newItem.set({ ...this.newItem(), item1: value });
  }

  updateNewItemArea(value: string) {
    this.newItem.set({ ...this.newItem(), area: value });
  }

  startEditItem(item: MonthlyPlan) {
    this.editingItem.set({...item});
  }

  updateEditItemName(value: string) {
    const item = this.editingItem();
    if (item) {
      this.editingItem.set({ ...item, item1: value });
    }
  }

  updateEditItemArea(value: string) {
    const item = this.editingItem();
    if (item) {
      this.editingItem.set({ ...item, area: value });
    }
  }

  saveEditItem() {
    const edited = this.editingItem();
    if (!edited || !edited.itemCode || !edited.item1) {
      alert('Please fill in Item Code and Item Name');
      return;
    }
    const index = this.items().findIndex(i => i.itemCode === edited.itemCode && i.area === edited.area);
    if (index !== -1) {
      const updated = [...this.items()];
      updated[index] = {...updated[index], item1: edited.item1, area: edited.area};
      this.items.set(updated);
      localStorage.setItem('monthly-plans', JSON.stringify(updated));
      this.editingItem.set(null);
      alert('Item updated successfully!');
    }
  }
}