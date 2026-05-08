'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Patient, ConversationLog, Appointment } from '@/types';
import { statusLabels, statusColors, formatPhone } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient & { appointments: Appointment[] } | null>(null);
  const [history, setHistory] = useState<ConversationLog[]>([]);
  const [tab, setTab] = useState<'appointments' | 'chat'>('appointments');

  useEffect(() => {
    Promise.all([
      api.get(`/patients/${id}`),
      api.get(`/patients/${id}/history`),
    ]).then(([p, h]) => {
      setPatient(p.data);
      setHistory(h.data);
    });
  }, [id]);

  if (!patient) return <div className="p-8 text-gray-400 text-sm">Carregando...</div>;

  return (
    <div>
      <Link href="/dashboard/patients" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
            {patient.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">{patient.name}</h2>
              {patient.isVulnerable && (
                <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={12} /> Vulnerável
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 text-sm text-gray-600">
              <div><span className="font-medium text-gray-500">Telefone:</span> {formatPhone(patient.phone)}</div>
              <div><span className="font-medium text-gray-500">Nascimento:</span> {format(new Date(patient.birthDate), 'dd/MM/yyyy', { locale: ptBR })}</div>
              <div><span className="font-medium text-gray-500">Convênio:</span> {patient.insuranceName ?? 'Particular'}</div>
              {patient.email && <div><span className="font-medium text-gray-500">E-mail:</span> {patient.email}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        {(['appointments', 'chat'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {t === 'appointments' ? 'Consultas' : 'Histórico de conversa'}
          </button>
        ))}
      </div>

      {tab === 'appointments' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {patient.appointments?.length === 0 && (
            <p className="p-5 text-sm text-gray-400 text-center">Nenhuma consulta.</p>
          )}
          {patient.appointments?.map((appt) => (
            <div key={appt.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 text-sm">{appt.psychologist.user.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {format(new Date(appt.slot.date), 'dd/MM/yyyy', { locale: ptBR })} às {appt.slot.startTime}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${statusColors[appt.status]}`}>
                {statusLabels[appt.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'chat' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 max-h-[500px] overflow-y-auto space-y-3">
          {history.length === 0 && (
            <p className="text-sm text-gray-400 text-center">Nenhuma mensagem registrada.</p>
          )}
          {history.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-blue-200'}`}>
                  {format(new Date(msg.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
