import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusLabels: Record<string, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
  RESCHEDULED: 'Remarcada',
};

export const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RESCHEDULED: 'bg-yellow-100 text-yellow-800',
};

export const modalityLabels: Record<string, string> = {
  PRESENTIAL: 'Presencial',
  TELECONSULT: 'Teleconsulta',
  BOTH: 'Ambos',
};

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  return phone;
}
