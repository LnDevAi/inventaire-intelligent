'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface AssetStats {
  total: number;
  byStatus: { status: string; _count: number }[];
  totalValue: { _sum: { netBookValue: number; purchasePrice: number } };
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    api.get<AssetStats>('/assets/stats')
      .then(setStats)
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Actifs', IN_MAINTENANCE: 'En maintenance', DISPOSED: 'Cédés', LOST: 'Perdus', STOLEN: 'Volés',
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Inventaire Intelligent</h1>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-400' : 'text-yellow-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
            {isOnline ? 'En ligne' : 'Hors ligne — synchro en attente'}
          </span>
          <button
            onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-sm text-gray-400">Total actifs</p>
            <p className="text-3xl font-bold mt-1">{stats?.total ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-sm text-gray-400">Valeur d'achat</p>
            <p className="text-3xl font-bold mt-1">
              {stats?.totalValue._sum.purchasePrice?.toLocaleString('fr-FR') ?? 0}
              <span className="text-sm text-gray-400 ml-1">FCFA</span>
            </p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-sm text-gray-400">VNC totale</p>
            <p className="text-3xl font-bold mt-1 text-blue-400">
              {stats?.totalValue._sum.netBookValue?.toLocaleString('fr-FR') ?? 0}
              <span className="text-sm text-gray-400 ml-1">FCFA</span>
            </p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-sm text-gray-400">Actifs opérationnels</p>
            <p className="text-3xl font-bold mt-1 text-green-400">
              {stats?.byStatus.find(s => s.status === 'ACTIVE')?._count ?? 0}
            </p>
          </div>
        </div>

        {/* Statuts */}
        <div className="bg-gray-900 border border-white/10 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Répartition par statut</h2>
          <div className="space-y-3">
            {stats?.byStatus.map(s => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{statusLabels[s.status] ?? s.status}</span>
                <span className="font-semibold">{s._count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation rapide */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Liste des biens', href: '/dashboard/assets', icon: '📦' },
            { label: 'Enrôler un tag', href: '/dashboard/enroll', icon: '🏷️' },
            { label: 'Carte GPS', href: '/dashboard/map', icon: '🗺️' },
          ].map(item => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="bg-gray-900 border border-white/10 hover:border-blue-500/50 rounded-xl p-5 text-left transition-colors"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-medium">{item.label}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
