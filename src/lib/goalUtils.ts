import { CRMRecord } from '../types';

export interface GoalTier {
  id: string;
  name: string;
  value: number; // Percentage of the individual goal (e.g. 80, 100, 120)
}

/**
 * Calculates monthly sales and projected performance for a consultant.
 */
export function calculateConsultantProjection(
  consultantId: string,
  selectedDate: string,
  records: Record<string, CRMRecord>
) {
  if (!selectedDate) return { monthlySales: 0, projection: 0 };
  
  const prefix = selectedDate.substring(0, 7); // "YYYY-MM"
  
  // Sum up won sales for this consultant in the active month
  const monthlySales = Object.values(records)
    .filter(r => r && r.logicalDate && r.logicalDate.startsWith(prefix) && r.consultantId === consultantId && r.status === 'WON')
    .reduce((sum, r) => sum + ((r as any).closedValue || 0), 0);
    
  // Calculate elapsed days and total days in the active month
  try {
    const parts = selectedDate.split('-');
    const year = parseInt(parts[0]) || new Date().getFullYear();
    const month = parseInt(parts[1]) || (new Date().getMonth() + 1);
    const day = parseInt(parts[2]) || 1;
    
    const totalDays = new Date(year, month, 0).getDate();
    const elapsedDays = Math.max(1, day);
    
    const projection = (monthlySales / elapsedDays) * totalDays;
    
    return { monthlySales, projection };
  } catch (e) {
    return { monthlySales, projection: monthlySales };
  }
}

/**
 * Determines alert colors and badge text for a consultant based on their projection vs goals.
 * Returning 3 main levels + exceeded level.
 */
export function getProjectionAlert(
  projection: number,
  individualGoal: number,
  tiers: GoalTier[]
) {
  const goal = individualGoal || 10000; // default if not set
  
  // Sort tiers by percentage value ascending
  const sortedTiers = [...tiers].sort((a, b) => a.value - b.value);
  
  if (sortedTiers.length === 0) {
    // Fallback if no tiers
    if (projection < goal) {
      return {
        level: 1,
        color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        barColor: 'bg-orange-500',
        label: 'Buscando a Meta'
      };
    }
    return {
      level: 4,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      barColor: 'bg-emerald-500',
      label: 'Meta Atingida'
    };
  }

  // Calculate absolute values for each tier
  const tierValues = sortedTiers.map(t => ({
    ...t,
    absVal: goal * (t.value / 100)
  }));

  // Find where the projection falls
  // Level 1: Below the lowest tier
  if (projection < tierValues[0].absVal) {
    return {
      level: 1,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      barColor: 'bg-orange-500',
      label: `Buscando a ${sortedTiers[0].name}`
    };
  }

  // Iterate through tiers to find the highest met
  for (let i = tierValues.length - 1; i >= 0; i--) {
    if (projection >= tierValues[i].absVal) {
      const isLast = i === tierValues.length - 1;
      if (isLast) {
        return {
          level: i + 2, // e.g. Level 4 (Exceeded/Mega)
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          barColor: 'bg-emerald-500',
          label: `${sortedTiers[i].name} ✓`
        };
      }
      
      // Middle tiers get orange/yellow/blue accordingly
      const colors = [
        'text-amber-400 bg-amber-500/10 border-amber-500/20',
        'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        'text-blue-400 bg-blue-500/10 border-blue-500/20',
        'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
      ];
      
      const barColors = [
        'bg-amber-500',
        'bg-yellow-500',
        'bg-blue-500',
        'bg-indigo-500'
      ];

      const styleIndex = Math.min(i, colors.length - 1);

      return {
        level: i + 2,
        color: colors[styleIndex],
        barColor: barColors[styleIndex],
        label: `${sortedTiers[i].name} ✓`
      };
    }
  }

  // Fallback
  return {
    level: 2,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    barColor: 'bg-blue-500',
    label: 'Dentro da Meta'
  };
}
