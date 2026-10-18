import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy', { locale: id });
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: id });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
