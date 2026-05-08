'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Appointment } from '@/types';
import { statusLabels, statusColors, modalityLabels } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, RefreshCw } from 'lucide-react';

const STATUS_OPTIONS = ['', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (status) params.set('status', status);

    const { data } = await api.get(`/appointments?${params}`);
    setAppointments(data.appointments);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, status]);

  async function updateStatus(id: string, newStatus: string) {
    await api.patch(`/appointments/${id}/status`, { status: newStatus });
    load();
  }

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Consultas</h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-4 p-4 flex items-center gap-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? statusLabels[s] : 'Todos os status'}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{total} consulta(s)</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Paciente', 'Psicólogo(a)', 'Data / Hora', 'Modalidade', 'Status', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            )}
            {!loading && appointments.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma consulta encontrada.</td></tr>
            )}
            {appointments.map((appt) => (
              <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{appt.patient.name}</p>
                  <p className="text-xs text-gray-500">{appt.patient.phone}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{appt.psychologist.user.name}</td>
                <td className="px-4 py-3 text-gray-700">
                  {format(new Date(appt.slot.date), 'dd/MM/yyyy', { locale: ptBR })} às{' '}
                  {appt.slot.startTime}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {modalityLabels[appt.modality]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[appt.status]}`}>
                    {statusLabels[appt.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={appt.status}
                    onChange={(e) => updateStatus(appt.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none"
                  >
                    {STATUS_OPTIONS.filter(Boolean).map((s) => (
                      <option key={s} value={s}>{statusLabels[s]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm text-gray-600 disabled:opacity-40 hover:text-gray-900"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-sm text-gray-600 disabled:opacity-40 hover:text-gray-900"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
