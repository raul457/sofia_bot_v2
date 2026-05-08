'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Slot, Psychologist } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function SlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [showBulk, setShowBulk] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bulk, setBulk] = useState({
    psychologistId: '',
    weekDays: [] as number[],
    dateFrom: '',
    dateTo: '',
    startTime: '08:00',
    endTime: '18:00',
    durationMin: 50,
    breakMin: 10,
    modality: 'PRESENTIAL',
  });

  async function load() {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const [s, p] = await Promise.all([
      api.get(`/slots?status=AVAILABLE&date_from=${today}`),
      api.get('/psychologists'),
    ]);
    setSlots(s.data);
    setPsychologists(p.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteSlot(id: string) {
    if (!confirm('Excluir este horário?')) return;
    await api.delete(`/slots/${id}`);
    load();
  }

  async function generateBulk() {
    await api.post('/slots/bulk', bulk);
    setShowBulk(false);
    load();
  }

  function toggleDay(day: number) {
    setBulk((b) => ({
      ...b,
      weekDays: b.weekDays.includes(day) ? b.weekDays.filter((d) => d !== day) : [...b.weekDays, day],
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Horários Disponíveis</h1>
        <button
          onClick={() => setShowBulk(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Gerar horários em lote
        </button>
      </div>

      {showBulk && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
            <h2 className="text-lg font-bold text-gray-800 mb-5">Gerar horários em lote</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Psicólogo(a)</label>
                <select
                  value={bulk.psychologistId}
                  onChange={(e) => setBulk((b) => ({ ...b, psychologistId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {psychologists.map((p) => (
                    <option key={p.id} value={p.id}>{p.user.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dias da semana</label>
                <div className="flex gap-2">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${bulk.weekDays.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data início</label>
                  <input type="date" value={bulk.dateFrom} onChange={(e) => setBulk((b) => ({ ...b, dateFrom: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data fim</label>
                  <input type="date" value={bulk.dateTo} onChange={(e) => setBulk((b) => ({ ...b, dateTo: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário início</label>
                  <input type="time" value={bulk.startTime} onChange={(e) => setBulk((b) => ({ ...b, startTime: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário fim</label>
                  <input type="time" value={bulk.endTime} onChange={(e) => setBulk((b) => ({ ...b, endTime: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                  <input type="number" value={bulk.durationMin} onChange={(e) => setBulk((b) => ({ ...b, durationMin: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (min)</label>
                  <input type="number" value={bulk.breakMin} onChange={(e) => setBulk((b) => ({ ...b, breakMin: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
                <select
                  value={bulk.modality}
                  onChange={(e) => setBulk((b) => ({ ...b, modality: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="PRESENTIAL">Presencial</option>
                  <option value="TELECONSULT">Teleconsulta</option>
                  <option value="BOTH">Ambos</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBulk(false)} className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2">Cancelar</button>
              <button onClick={generateBulk} className="bg-blue-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-blue-700 transition">Gerar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Psicólogo(a)', 'Data', 'Horário', 'Duração', 'Modalidade', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
            {!loading && slots.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum horário disponível.</td></tr>}
            {slots.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{s.psychologist?.user.name}</td>
                <td className="px-4 py-3 text-gray-600">{format(new Date(s.date), 'dd/MM/yyyy (EEE)', { locale: ptBR })}</td>
                <td className="px-4 py-3 text-gray-600">{s.startTime} – {s.endTime}</td>
                <td className="px-4 py-3 text-gray-600">{s.durationMin}min</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {s.modality === 'PRESENTIAL' ? 'Presencial' : s.modality === 'TELECONSULT' ? 'Teleconsulta' : 'Ambos'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteSlot(s.id)} className="text-red-400 hover:text-red-600 transition">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
