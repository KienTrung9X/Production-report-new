export interface DailyProd {
  plan: number;
  act: number | null;
}

export interface ProductionLine {
  name: string;
  data: DailyProd[];
  monthlyPlan?: number;
  monthlyAct?: number;
}

const DEFAULT_WORK_DAYS: { [key: string]: number } = {
  '202504': 23, '202505': 23, '202506': 21, '202507': 22, '202508': 23, '202509': 22,
  '202510': 23, '202511': 20, '202512': 23, '202601': 22, '202602': 15, '202603': 26
};

export function processProductionData(actualData: any[], planData: any[]): {
  dates: string[];
  weavingData: ProductionLine[];
  knitcordData: ProductionLine[];
  formingData: ProductionLine[];
  sewingData: ProductionLine[];
  heatsetData: ProductionLine[];
  spchData: ProductionLine[];
} {
  const workDays = loadWorkDays();
  const dates = [...new Set(actualData.map(item => item.week))].sort();
  
  // Create plan map by area and itemCode
  const planMap = new Map<string, any>();
  planData.forEach(item => {
    const key = `${item.line1}-${item.itemCode}`;
    planMap.set(key, item);
  });

  const dataMaps: { [key: string]: Map<string, ProductionLine> } = {
    '111': new Map(), '121': new Map(), '312': new Map(),
    '313': new Map(), '161': new Map(), '315': new Map(),
  };

  // First, create all lines with plan data
  const itemCodeMap = new Map<string, string>(); // itemCode -> description
  actualData.forEach(item => {
    const areaCode = item.area;
    const description = (areaCode === '312' && item.item2) ? item.item2 : (item.item2 || 'Unknown');
    const itemCode = item.item1;
    const key = `${areaCode}-${itemCode}`;
    if (!itemCodeMap.has(key)) {
      itemCodeMap.set(key, description);
    }
  });

  // Create lines with plan data
  itemCodeMap.forEach((description, key) => {
    const [areaCode, itemCode] = key.split('-');
    const map = dataMaps[areaCode];
    if (!map || map.has(description)) return;

    const planKey = key;
    const planItem = planMap.get(planKey);
    
    // Get the last month in dates for monthly plan
    const lastMonth = dates.length > 0 ? dates[dates.length - 1].substring(0, 6) : '';
    const monthlyPlanTotal = planItem?.plans?.[lastMonth] || 0;
    
    map.set(description, {
      name: description,
      data: dates.map(d => {
        const month = d.substring(0, 6);
        const monthlyPlan = planItem?.plans?.[month] || 0;
        const dailyPlan = monthlyPlan / (workDays[month] || 1);
        return { plan: Math.round(dailyPlan), act: 0 };
      }),
      monthlyPlan: monthlyPlanTotal,
      monthlyAct: 0
    });
  });

  // Track monthly act by month
  const monthlyActMap = new Map<string, Map<string, number>>(); // areaCode-description -> month -> total

  // Sum up actual data by date and item
  actualData.forEach(item => {
    const areaCode = item.area;
    const map = dataMaps[areaCode];
    if (!map) return;

    const description = (areaCode === '312' && item.item2) ? item.item2 : (item.item2 || 'Unknown');
    const line = map.get(description);
    if (!line) return;

    const dateIndex = dates.indexOf(item.week);
    if (dateIndex !== -1) {
      const actInKm = (item.actualQty || 0) / 1000; // Convert m to km
      const currentAct = line.data[dateIndex].act || 0;
      line.data[dateIndex].act = currentAct + actInKm;
      
      // Only add to monthlyAct if it's in the last month
      const lastMonth = dates[dates.length - 1].substring(0, 6);
      const itemMonth = item.week.substring(0, 6);
      if (itemMonth === lastMonth) {
        line.monthlyAct! += actInKm;
      }
    }
  });

  return {
    dates,
    weavingData: Array.from(dataMaps['111'].values()),
    knitcordData: Array.from(dataMaps['121'].values()),
    formingData: Array.from(dataMaps['312'].values()),
    sewingData: Array.from(dataMaps['313'].values()),
    heatsetData: Array.from(dataMaps['161'].values()),
    spchData: Array.from(dataMaps['315'].values()),
  };
}

function loadWorkDays(): { [key: string]: number } {
  try {
    const saved = localStorage.getItem('work-days');
    return saved ? JSON.parse(saved) : DEFAULT_WORK_DAYS;
  } catch {
    return DEFAULT_WORK_DAYS;
  }
}


