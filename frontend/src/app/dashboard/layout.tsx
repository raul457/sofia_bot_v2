'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
  LogOut,
  AlertTriangle,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/appointments', label: 'Consultas', icon: Calendar },
  { href: '/dashboard/patients', label: 'Pacientes', icon: Users },
  { href: '/dashboard/slots', label: 'Horários', icon: Clock },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
];

interface CrisisAlert {
  phone: string;
  patientName?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);

  // Polling para alertas de crise (substitui Socket.io — serverless-safe)
  const pollCrisis = useCallback(async () => {
    try {
      const { data } = await api.get('/patients?isVulnerable=true&limit=5');
      const vulnerable = data.patients as Array<{ phone: string; name: string; updatedAt: string }>;

      // Mostra alerta se paciente ficou vulnerável nos últimos 5 minutos
      const recent = vulnerable.filter((p) => {
        const updatedAt = new Date(p.updatedAt).getTime();
        return Date.now() - updatedAt < 5 * 60 * 1000;
      });

      if (recent.length > 0) {
        setCrisisAlerts(recent.map((p) => ({ phone: p.phone, patientName: p.name })));
        setTimeout(() => setCrisisAlerts([]), 15000);
      }
    } catch {
      // silencia erros de poll
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    pollCrisis();
    const interval = setInterval(pollCrisis, 30000);
    return () => clearInterval(interval);
  }, [router, pollCrisis]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💙</span>
            <div>
              <h1 className="font-bold text-gray-800">Sofia</h1>
              <p className="text-xs text-gray-500">Painel Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {crisisAlerts.map((alert, i) => (
          <div
            key={i}
            className="fixed top-4 right-4 z-50 bg-red-600 text-white rounded-xl shadow-xl p-4 max-w-sm"
            style={{ top: `${1 + i * 5.5}rem` }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="font-bold text-sm">ALERTA DE CRISE</p>
                <p className="text-xs mt-1">
                  {alert.patientName ?? 'Não identificado'} — {alert.phone}
                </p>
                <p className="text-xs mt-1 opacity-90">Entre em contato imediatamente.</p>
              </div>
            </div>
          </div>
        ))}

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
