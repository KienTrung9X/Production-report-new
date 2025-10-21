import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Định nghĩa kiểu dữ liệu cho item đầu vào
interface Item {
  line: string;
  item_code: string;
  amount: number;
  month: string;
  description: string;
}

// Định nghĩa kiểu dữ liệu cho item sau khi đã thêm 'plan'
interface ItemWithPlan extends Item {
  plan: number | null;
}

// Định nghĩa kiểu dữ liệu cho đối tượng chứa các kế hoạch
type PlanData = {
  [key: string]: number;
};

@Component({
  selector: 'app-production-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2>Production Report with Plan</h2>
      <table>
        <thead>
          <tr>
            <th>Line</th>
            <th>Item Code</th>
            <th>Description</th>
            <th>Month</th>
            <th>Amount</th>
            <th>Plan</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of updatedItems; let i = index">
            <td>{{ item.line }}</td>
            <td>{{ item.item_code }}</td>
            <td>{{ item.description }}</td>
            <td>{{ item.month }}</td>
            <td>{{ item.amount | number }}</td>
            <td>
              <!-- Ô nhập liệu cho Plan -->
              <input type="number" [value]="item.plan" (change)="onPlanChange($event, i)" placeholder="Nhập plan">
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .container { padding: 20px; font-family: sans-serif; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    thead { background-color: #f2f2f2; }
    input { width: 100px; padding: 5px; }
  `]
})
export class ProductionReportComponent implements OnInit {

  // Dữ liệu cuối cùng sau khi đã xử lý
  public updatedItems: ItemWithPlan[] = [];

  ngOnInit(): void {
    // Dữ liệu đầu vào (ví dụ: lấy từ API)
    const initialItems: Item[] = [
      { line: "111", item_code: "3684480.0", amount: 3684480.0, month: "05", description: "PB14 TAPE NAT" },
      { line: "121", item_code: "9286.0", amount: 9286.0, month: "05", description: "YK2 CORD" },
      { line: "111", item_code: "3684480.0", amount: 4500000.0, month: "06", description: "PB14 TAPE NAT" },
      { line: "131", item_code: "5555.0", amount: 12345.0, month: "05", description: "NEW ITEM" }
    ];

    // Dữ liệu kế hoạch (ví dụ: lấy từ một nguồn khác)
    const monthlyPlans: PlanData = {
      "3684480.0-05": 1000,
      "3684480.0-06": 1250,
      "9286.0-06": 500
    };

    // Gọi hàm để xử lý
    this.updatedItems = this.addPlanToItems(initialItems, monthlyPlans);

    console.log('Final data with plan:', this.updatedItems);
  }

  // Hàm xử lý khi người dùng thay đổi giá trị trong ô input 'plan'
  onPlanChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const newPlan = input.value ? parseFloat(input.value) : null;
    this.updatedItems[index].plan = newPlan;
    console.log(`Updated plan for item ${this.updatedItems[index].item_code}:`, this.updatedItems[index].plan);
  }

  /**
   * Thêm trường 'plan' vào danh sách các mục (items).
   */
  private addPlanToItems(items: Item[], plansData: PlanData): ItemWithPlan[] {
    const planMap = new Map<string, number>(Object.entries(plansData));

    return items.map(item => {
      const lookupKey = `${item.item_code}-${item.month}`;
      const planValue = planMap.get(lookupKey);

      return {
        ...item,
        plan: planValue !== undefined ? planValue : null
      };
    });
  }
}