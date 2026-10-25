import { TrainFilterState, TrainJourney, TrainStatus } from '../types/train';

export function getLowestFare(journey: TrainJourney): number {
  if (!journey.fares || journey.fares.length === 0) return 0;
  return Math.min(...journey.fares.map((f) => f.price));
}

export function getHighestFare(journey: TrainJourney): number {
  if (!journey.fares || journey.fares.length === 0) return 0;
  return Math.max(...journey.fares.map((f) => f.price));
}

export function filterAndSortTrains(
  trains: TrainJourney[],
  filters: TrainFilterState
): TrainJourney[] {
  let result = [...trains];

  // 1. Text Search Filter (Train Number, Origin City, Destination City, Operator)
  if (filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.trim().toLowerCase();
    result = result.filter(
      (t) =>
        t.trainNumber.toLowerCase().includes(q) ||
        t.operator.toLowerCase().includes(q) ||
        t.origin.city.toLowerCase().includes(q) ||
        t.origin.name.toLowerCase().includes(q) ||
        t.destination.city.toLowerCase().includes(q) ||
        t.destination.name.toLowerCase().includes(q)
    );
  }

  // 2. Status Filter
  if (filters.statusFilter !== 'ALL') {
    result = result.filter((t) => t.status === filters.statusFilter);
  }

  // 3. Operator Filter
  if (filters.operatorFilter !== 'ALL') {
    result = result.filter((t) => t.operator === filters.operatorFilter);
  }

  // 4. Max Price Filter
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    result = result.filter((t) => getLowestFare(t) <= (filters.maxPrice as number));
  }

  // 5. Sorting
  result.sort((a, b) => {
    let comparison = 0;
    if (filters.sortBy === 'departure') {
      comparison = new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
    } else if (filters.sortBy === 'price') {
      comparison = getLowestFare(a) - getLowestFare(b);
    } else if (filters.sortBy === 'duration') {
      comparison = a.durationMinutes - b.durationMinutes;
    }

    return filters.sortOrder === 'desc' ? -comparison : comparison;
  });

  return result;
}

export function formatTimeOnly(isoDateTime: string): string {
  try {
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) {
      return isoDateTime.includes('T') ? isoDateTime.split('T')[1].substring(0, 5) : isoDateTime;
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return isoDateTime;
  }
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  if (currency === 'EUR') return `€${amount.toFixed(2)}`;
  if (currency === 'USD') return `$${amount.toFixed(2)}`;
  if (currency === 'GBP') return `£${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

export function getStatusTheme(status: TrainStatus): {
  backgroundColor: string;
  textColor: string;
  label: string;
} {
  switch (status) {
    case 'ON_TIME':
      return { backgroundColor: '#DCFCE7', textColor: '#166534', label: 'On Time' };
    case 'DELAYED':
      return { backgroundColor: '#FEF3C7', textColor: '#92400E', label: 'Delayed' };
    case 'CANCELLED':
      return { backgroundColor: '#FEE2E2', textColor: '#991B1B', label: 'Cancelled' };
    case 'BOARDING':
      return { backgroundColor: '#DBEAFE', textColor: '#1E40AF', label: 'Boarding' };
    default:
      return { backgroundColor: '#F1F5F9', textColor: '#475569', label: status };
  }
}

export function calculateTotalDuration(journeys: TrainJourney[]): {
  totalMinutes: number;
  formatted: string;
} {
  const totalMinutes = journeys.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    totalMinutes,
    formatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
  };
}
