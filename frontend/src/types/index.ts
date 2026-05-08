export type Role = 'ADMIN' | 'RECEPTIONIST' | 'PSYCHOLOGIST';
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export type SlotStatus = 'AVAILABLE' | 'RESERVED' | 'BLOCKED';
export type Modality = 'PRESENTIAL' | 'TELECONSULT' | 'BOTH';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  psychologist?: Psychologist;
}

export interface Psychologist {
  id: string;
  userId: string;
  specialty: string;
  bio?: string;
  user: { name: string; email: string };
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  email?: string;
  insuranceType?: string;
  insuranceName?: string;
  isVulnerable: boolean;
  consentGiven: boolean;
  createdAt: string;
  _count?: { appointments: number };
}

export interface Slot {
  id: string;
  psychologistId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  modality: Modality;
  status: SlotStatus;
  psychologist?: { user: { name: string } };
  appointment?: Appointment;
}

export interface Appointment {
  id: string;
  patientId: string;
  psychologistId: string;
  slotId: string;
  status: AppointmentStatus;
  modality: Modality;
  notes?: string;
  teleconsultUrl?: string;
  confirmedAt?: string;
  createdAt: string;
  patient: { id: string; name: string; phone: string };
  psychologist: { user: { name: string } };
  slot: Slot;
}

export interface DashboardMetrics {
  today: number;
  week: number;
  month: number;
  total: number;
  scheduled: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ConversationLog {
  id: string;
  phone: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
