import { Injectable } from '@angular/core';

export interface ProductionDataItem {
  Ln1: string;
  Ln2: string;
  LINENAME: string;
  Key1: string;
  ProSheet: string;
  ITMC9H: string;
  IT1IA0: string;
  CLRC9H: string;
  ComDate: string;
  RequestQty: number;
  ComQty: number;
  ShrtQty: number;
  NewPP: string;
  NewPR: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:5000/api';

  async getRawData(startDate: string, endDate: string, line?: string): Promise<any[]> {
    try {
      let url = `${this.baseUrl}/raw-data?start_date=${startDate}&end_date=${endDate}`;
      if (line) {
        url += `&line=${encodeURIComponent(line)}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching raw data:', error);
      return [];
    }
  }

  async getLines(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/lines`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching lines:', error);
      return [];
    }
  }

  async getProductionData(startDate: string, endDate: string, saveToFile: boolean = false): Promise<any> {
    try {
      const url = `${this.baseUrl}/production-data?start_date=${startDate}&end_date=${endDate}${saveToFile ? '&save=true' : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching production data:', error);
      return { error: error.message || 'Không thể kết nối backend' };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      const response = await fetch(`${this.baseUrl}/test-connection`);
      return await response.json();
    } catch (error) {
      return {success: false, error: 'Không thể kết nối backend'};
    }
  }
}
