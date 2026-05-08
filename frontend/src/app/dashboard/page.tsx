'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardMetrics, Appointment } from '@/types';
import { statusLabels, statusColors, modalityLabels } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Users, TrendingUp, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recent, setRecent] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [m, a] = await Promise.all([
        api.get('/appointments/metrics'),
        api.get('/appointments?limit=5'),
      ]);
      setMetrics(m.data);
      setRecent(a.data.appointments);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    );
  }

  const cards = [
    { label: 'Consultas hoje', value: metrics?.today ?? 0, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
    { label: 'Esta semana', value: metrics?.week ?? 0, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Este mês', value: metrics?.month ?? 0, icon: Clock, color: 'text-purple-600 bg-purple-50' },
    { label: 'Agendadas/Confirmadas', value: metrics?.scheduled ?? 0, icon: Users, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Consultas recentes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recent.length === 0 && (
            <p className="p-5 text-sm text-gray-400 text-center">Nenhuma consulta registrada.</p>
          )}
          {recent.map((appt) => (
            <div key={appt.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-gray-800 text-sm">{appt.patient.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {appt.psychologist.user.name} ·{' '}
                  {format(new Date(appt.slot.date), 'dd MMM yyyy', { locale: ptBR })} às{' '}
                  {appt.slot.startTime}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {modalityLabels[appt.modality]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[appt.status]}`}>
                  {statusLabels[appt.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
