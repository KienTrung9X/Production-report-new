export interface RawDataItem {
  area: string;
  week: string;
  line: string;
  itemcode: string;
  item1: string;
  item2: string;
  planQty: number;
  actualQty: number;
  unit: string;
  date: string;
  group: string;
}

export interface ProcessedLine {
  name: string;
  machineGroup: string;
  data: { plan: number; act: number | null }[];
  monthlyPlan?: number;
  monthlyAct?: number;
}

export function processRawData(rawData: RawDataItem[], startDate: string, endDate: string) {
  // Convert date strings to numbers for comparison
  const startDateNum = parseInt(startDate.replace(/-/g, ''));
  const endDateNum = parseInt(endDate.replace(/-/g, ''));
  
  console.log('Filtering data from', startDateNum, 'to', endDateNum);
  
  // Filter data by date range
  const filteredData = rawData.filter(item => {
    const itemDate = parseInt(item.date);
    return itemDate >= startDateNum && itemDate <= endDateNum;
  });
  
  console.log('Filtered data:', filteredData.length, 'records from', rawData.length, 'total');
  
  const dates = [...new Set(filteredData.map(item => item.date))].sort();
  
  const areaMap: { [area: string]: { [line: string]: ProcessedLine } } = {};
  const areaItems: { [area: string]: Set<string> } = {};
  
  filteredData.forEach(item => {
    if (!areaMap[item.area]) {
      areaMap[item.area] = {};
      areaItems[item.area] = new Set();
    }
    
    areaItems[item.area].add(item.item2);
    
    if (!areaMap[item.area][item.line]) {
      areaMap[item.area][item.line] = {
        name: item.line,
        machineGroup: item.item2,
        data: dates.map(() => ({ plan: 0, act: 0 })),
        monthlyPlan: 0,
        monthlyAct: 0
      };
    }
    
    const dateIndex = dates.indexOf(item.date);
    if (dateIndex !== -1) {
      const line = areaMap[item.area][item.line];
      line.data[dateIndex].plan += item.planQty;
      line.data[dateIndex].act! += item.actualQty;
      line.monthlyPlan! += item.planQty;
      line.monthlyAct! += item.actualQty;
    }
  });
  
  return {
    dates,
    Weaving: Object.values(areaMap['111'] || {}),
    Knitcord: Object.values(areaMap['121'] || {}),
    Forming: Object.values(areaMap['312'] || {}),
    Sewing: Object.values(areaMap['313'] || {}),
    Heatset: Object.values(areaMap['161'] || {}),
    SPCH: Object.values(areaMap['315'] || {}),
    areaItems: {
      'Weaving': Array.from(areaItems['111'] || []),
      'Knitcord': Array.from(areaItems['121'] || []),
      'Forming': Array.from(areaItems['312'] || []),
      'Sewing': Array.from(areaItems['313'] || []),
      'Heatset': Array.from(areaItems['161'] || []),
      'SPCH': Array.from(areaItems['315'] || [])
    }
  };
}
