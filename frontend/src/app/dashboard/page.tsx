'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Asset } from '@/lib/types';

interface AssetStats {
  total: number;
  byStatus: { status: string; _count: number }[];
  totalValue: { _sum: { netBookValue: number; purchasePrice: number } };
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE:         { label: 'Actifs',       color: '#22c55e' },
  IN_MAINTENANCE: { label: 'Maintenance',  color: '#eab308' },
  DISPOSED:       { label: 'Cédés',        color: '#6b7280' },
  LOST:           { label: 'Perdus',       color: '#f97316' },
  STOLEN:         { label: 'Volés',        color: '#ef4444' },
};

const TAG_ICON: Record<string, string> = { QR: '⬛', RFID: '📡', BLE: '🔵', GPS: '🛰️' };

function buildConicGradient(segments: { pct: number; color: string }[]) {
  const active = segments.filter(s => s.pct > 0);
  if (active.length === 0) return 'conic-gradient(#374151 0% 100%)';
  let pos = 0;
  const parts = active.map(s => {
    const from = pos;
    pos += s.pct;
    return `${s.color} ${from.toFixed(2)}% ${pos.toFixed(2)}%`;
  });
  return `conic-gradient(${parts.join(', ')})`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    Promise.all([
      api.get<AssetStats>('/assets/stats'),
      api.get<Asset[]>('/assets'),
    ])
      .then(([s, a]) => { setStats(s); setAssets(a); })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // ── Computed ──────────────────────────────────────────────────────────
  const purchaseTotal = stats?.totalValue._sum.purchasePrice ?? 0;
  const vncTotal      = stats?.totalValue._sum.netBookValue  ?? 0;
  const deprecPct     = purchaseTotal > 0 ? (1 - vncTotal / purchaseTotal) * 100 : 0;
  const activeCount   = stats?.byStatus.find(s => s.status === 'ACTIVE')?._count ?? 0;

  const tagCount  = assets.reduce((n, a) => n + a.tags.length, 0);
  const byTagType = assets.flatMap(a => a.tags).reduce(
    (acc, t) => { acc[t.tagType] = (acc[t.tagType] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  const batteryAlerts = assets
    .flatMap(a => a.tags
      .filter(t => (t.batteryLevel ?? 100) < 20)
      .map(t => ({ ...t, assetName: a.name })),
    )
    .sort((a, b) => (a.batteryLevel ?? 0) - (b.batteryLevel ?? 0));

  const byCategory = assets.reduce(
    (acc, a) => {
      if (!acc[a.category]) acc[a.category] = { count: 0, vnc: 0 };
      acc[a.category].count++;
      acc[a.category].vnc += a.netBookValue;
      return acc;
    },
    {} as Record<string, { count: number; vnc: number }>,
  );
  const categoryRows = Object.entries(byCategory).sort((a, b) => b[1].vnc - a[1].vnc);
  const maxVnc = Math.max(...categoryRows.map(([, v]) => v.vnc), 1);

  const total = stats?.total ?? 0;
  const donutSegments = (stats?.byStatus ?? [])
    .filter(s => s._count > 0)
    .map(s => ({
      pct:   total > 0 ? (s._count / total) * 100 : 0,
      color: STATUS_META[s.status]?.color ?? '#6b7280',
      label: STATUS_META[s.status]?.label ?? s.status,
      count: s._count,
    }));

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement du tableau de bord…</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Inventaire Intelligent</h1>
          <p className="text-xs text-gray-500 mt-0.5">eDefence — gestion des actifs</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-400' : 'text-yellow-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
            {isOnline ? 'En ligne' : 'Hors ligne — synchro en attente'}
          </span>
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Profil
          </button>
          <button
            onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── KPIs primaires ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total actifs"          value={total}                              color="text-white"     />
          <KpiCard label="Valeur d'achat"        value={purchaseTotal.toLocaleString('fr-FR')} unit="FCFA" color="text-white"     />
          <KpiCard label="VNC totale"            value={vncTotal.toLocaleString('fr-FR')}      unit="FCFA" color="text-blue-400"  />
          <KpiCard label="Actifs opérationnels"  value={activeCount} unit={`/ ${total}`}   color="text-green-400" />
        </div>

        {/* ── KPIs secondaires ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Dépréciation globale */}
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-sm text-gray-400">Dépréciation globale</p>
            <p className={`text-3xl font-bold mt-1 ${
              deprecPct > 50 ? 'text-red-400' : deprecPct > 25 ? 'text-orange-400' : 'text-green-400'
            }`}>
              {deprecPct.toFixed(1)}%
            </p>
            <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  deprecPct > 50 ? 'bg-red-500' : deprecPct > 25 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(deprecPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              VNC résiduelle : {(100 - deprecPct).toFixed(1)}%
            </p>
          </div>

          {/* Tags enrôlés */}
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-sm text-gray-400">Tags enrôlés</p>
            <p className="text-3xl font-bold mt-1">{tagCount}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(byTagType).map(([type, count]) => (
                <span key={type} className="flex items-center gap-1 text-xs bg-white/5 rounded-lg px-2 py-1">
                  {TAG_ICON[type]} <span className="font-medium">{count}</span>
                </span>
              ))}
              {tagCount === 0 && (
                <button
                  onClick={() => router.push('/dashboard/enroll')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Enrôler un premier tag →
                </button>
              )}
            </div>
          </div>

          {/* Alertes batterie */}
          <div className={`bg-gray-900 border rounded-xl p-5 ${
            batteryAlerts.length > 0 ? 'border-red-500/30' : 'border-white/10'
          }`}>
            <p className="text-sm text-gray-400">Alertes batterie &lt; 20%</p>
            <p className={`text-3xl font-bold mt-1 ${
              batteryAlerts.length > 0 ? 'text-red-400' : 'text-gray-500'
            }`}>
              {batteryAlerts.length}
            </p>
            {batteryAlerts.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {batteryAlerts.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 truncate max-w-[7rem]">{t.assetName}</span>
                    <span className="text-red-400 font-semibold shrink-0">
                      🔋 {t.batteryLevel ?? 0}%
                    </span>
                  </div>
                ))}
                {batteryAlerts.length > 3 && (
                  <p className="text-xs text-gray-600">+{batteryAlerts.length - 3} autres</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-600 mt-2">Toutes les batteries sont OK</p>
            )}
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Donut — statuts */}
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6">
            <h2 className="font-semibold mb-6">Répartition par statut</h2>
            {total === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
                Aucun actif enregistré
              </div>
            ) : (
              <div className="flex items-center gap-8">
                {/* Donut conic-gradient */}
                <div className="relative shrink-0 w-36 h-36">
                  <div
                    className="w-36 h-36 rounded-full"
                    style={{ background: buildConicGradient(donutSegments) }}
                  />
                  {/* Centre */}
                  <div className="absolute inset-[18px] bg-gray-900 rounded-full flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold leading-none">{total}</p>
                    <p className="text-xs text-gray-500 mt-0.5">biens</p>
                  </div>
                </div>
                {/* Légende */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  {donutSegments.map(s => (
                    <div key={s.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-sm text-gray-300 truncate">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold">{s.count}</span>
                        <span className="text-xs text-gray-500 w-9 text-right">{s.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barres horizontales — VNC par catégorie */}
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6">
            <h2 className="font-semibold mb-6">VNC par catégorie</h2>
            {categoryRows.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
                Aucun actif enregistré
              </div>
            ) : (
              <div className="space-y-4">
                {categoryRows.map(([cat, data]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-300 font-medium">{cat}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">{data.count} bien(s)</span>
                        <span className="text-blue-400 font-mono">
                          {data.vnc.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-700/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                        style={{ width: `${(data.vnc / maxVnc) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Accès rapide ── */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Accès rapide</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Liste des biens',
                href: '/dashboard/assets',
                icon: '📦',
                desc: `${total} actif(s) · ${
                  stats?.byStatus.find(s => s.status === 'IN_MAINTENANCE')?._count ?? 0
                } en maintenance`,
              },
              {
                label: 'Enrôler un tag',
                href: '/dashboard/enroll',
                icon: '🏷️',
                desc: `${tagCount} tag(s) actif(s)`,
              },
              {
                label: 'Scan terrain',
                href: '/dashboard/scan',
                icon: '📱',
                desc: 'QR · RFID · GPS — mode offline',
              },
              {
                label: 'Carte GPS',
                href: '/dashboard/map',
                icon: '🗺️',
                desc: `${byTagType['GPS'] ?? 0} balise(s) GPS · ${byTagType['BLE'] ?? 0} BLE`,
              },
            ].map(item => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="bg-gray-900 border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5 rounded-xl p-5 text-left transition-all group"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="font-semibold group-hover:text-blue-400 transition-colors">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  unit = '',
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>
        {value}
        {unit && <span className="text-sm text-gray-400 ml-1.5 font-normal">{unit}</span>}
      </p>
    </div>
  );
}
