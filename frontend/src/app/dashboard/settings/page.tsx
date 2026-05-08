'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST',
    specialty: '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', form);
      setSuccess('Usuário criado com sucesso!');
      setForm({ name: '', email: '', password: '', role: 'RECEPTIONIST', specialty: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao criar usuário.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurações</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">Cadastrar novo usuário</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ADMIN">Administrador</option>
              <option value="RECEPTIONIST">Recepcionista</option>
              <option value="PSYCHOLOGIST">Psicólogo(a)</option>
            </select>
          </div>

          {form.role === 'PSYCHOLOGIST' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                placeholder="Ex: Terapia Cognitivo-Comportamental"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar usuário'}
          </button>
        </form>
      </div>
    </div>
  );
}
