'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ExportButton from '@/components/ExportButton';

interface Asset {
  id: string;
  name: string;
  category: string;
  status: string;
  purchasePrice: number;
  netBookValue: number;
  purchaseDate: string;
  depreciationYears: number;
}

function yearsElapsed(date: string): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function yearsRemaining(date: string, depreciationYears: number): number {
  return Math.max(0, depreciationYears - yearsElapsed(date));
}

function amortPct(asset: Asset): number {
  if (asset.purchasePrice === 0) return 100;
  return Math.min(100, ((asset.purchasePrice - asset.netBookValue) / asset.purchasePrice) * 100);
}

const STATUS_FR: Record<string, string> = {
  ACTIVE: 'Actif', IN_MAINTENANCE: 'En maintenance', DISPOSED: 'Cédé', LOST: 'Perdu', STOLEN: 'Volé',
};

export default function ReportsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get<Asset[]>('/assets');
      setAssets(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    load();
  }, [load, router]);

  const categories = [...new Set(assets.map((a) => a.category))].sort();
  const statuses = [...new Set(assets.map((a) => a.status))];

  const filtered = assets.filter((a) => {
    return (!filterCat || a.category === filterCat) && (!filterStatus || a.status === filterStatus);
  });

  const totalPurchase = filtered.reduce((s, a) => s + a.purchasePrice, 0);
  const totalVNC = filtered.reduce((s, a) => s + a.netBookValue, 0);
  const avgAmort = filtered.length
    ? filtered.reduce((s, a) => s + amortPct(a), 0) / filtered.length
    : 0;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Chargement…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapport d&apos;amortissement</h1>
          <p className="text-slate-500 text-sm">{filtered.length} bien(s) — Valeur nette comptable au {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <ExportButton assets={filtered} filename="rapport_amortissement" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous statuts</option>
          {statuses.map((s) => <option key={s} value={s}>{STATUS_FR[s] ?? s}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Valeur d&apos;achat totale</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(totalPurchase)} F</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">VNC totale</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{fmt(totalVNC)} F</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Amorti moyen</p>
          <p className="mt-1 text-2xl font-bold text-orange-500">{avgAmort.toFixed(1)} %</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left">
            <tr>
              {['Bien', 'Catégorie', 'Statut', "Prix d'achat", 'VNC', '% amorti', 'Durée restante'].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun bien trouvé</td></tr>
            )}
            {filtered.map((a) => {
              const pct = amortPct(a);
              const remaining = yearsRemaining(a.purchaseDate, a.depreciationYears);
              return (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      a.status === 'IN_MAINTENANCE' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'}`}>
                      {STATUS_FR[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{fmt(a.purchasePrice)} F</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold">{fmt(a.netBookValue)} F</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-slate-600">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {remaining < 0.1 ? <span className="text-red-500 font-medium">Totalement amorti</span> : `${remaining.toFixed(1)} ans`}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-slate-700">Totaux ({filtered.length} biens)</td>
                <td className="px-4 py-3 text-right font-mono text-slate-900">{fmt(totalPurchase)} F</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-700">{fmt(totalVNC)} F</td>
                <td className="px-4 py-3 text-slate-700">{avgAmort.toFixed(1)}% moy.</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
