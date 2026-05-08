'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Patient } from '@/types';
import { formatPhone } from '@/lib/utils';
import { Search, AlertTriangle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [onlyVulnerable, setOnlyVulnerable] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (onlyVulnerable) params.set('isVulnerable', 'true');

    const { data } = await api.get(`/patients?${params}`);
    setPatients(data.patients);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, onlyVulnerable]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pacientes</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyVulnerable}
            onChange={(e) => { setOnlyVulnerable(e.target.checked); setPage(1); }}
            className="accent-red-500"
          />
          Somente vulneráveis
        </label>

        <span className="text-sm text-gray-500">{total} paciente(s)</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Paciente', 'Telefone', 'Nascimento', 'Convênio', 'Consultas', ''].map((h) => (
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
            {!loading && patients.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum paciente encontrado.</td></tr>
            )}
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.isVulnerable && (
                      <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    )}
                    <span className="font-medium text-gray-800">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{formatPhone(p.phone)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {format(new Date(p.birthDate), 'dd/MM/yyyy', { locale: ptBR })}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.insuranceName ?? 'Particular'}</td>
                <td className="px-4 py-3 text-gray-600">{p._count?.appointments ?? 0}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/patients/${p.id}`} className="text-blue-600 hover:text-blue-800">
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-gray-600 disabled:opacity-40">Anterior</button>
            <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-sm text-gray-600 disabled:opacity-40">Próxima</button>
          </div>
        )}
      </div>
    </div>
  );
}
