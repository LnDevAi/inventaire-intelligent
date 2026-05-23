'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Asset, AssetStatus, CreateAssetPayload } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import AssetForm from '@/components/AssetForm';

const TAG_TYPE_ICON: Record<string, string> = {
  QR: '⬛', RFID: '📡', BLE: '🔵', GPS: '🛰️',
};

type Modal = { mode: 'create' } | { mode: 'edit'; asset: Asset } | { mode: 'detail'; asset: Asset } | null;

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<AssetStatus | 'ALL'>('ALL');

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

  const filtered = assets.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function handleCreate(data: CreateAssetPayload) {
    await api.post('/assets', data);
    setModal(null);
    load();
  }

  async function handleEdit(id: string, data: CreateAssetPayload) {
    await api.patch(`/assets/${id}`, data);
    setModal(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce bien définitivement ?')) return;
    await api.delete(`/assets/${id}`);
    load();
  }

  const totalVNC = assets.reduce((s, a) => s + a.netBookValue, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Chargement des actifs...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Dashboard
          </button>
          <span className="text-white/20">/</span>
          <h1 className="text-xl font-bold">Biens</h1>
        </div>
        <button onClick={() => setModal({ mode: 'create' })}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors">
          + Nouveau bien
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400">Total biens</p>
            <p className="text-2xl font-bold mt-0.5">{assets.length}</p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400">VNC totale</p>
            <p className="text-2xl font-bold mt-0.5 text-blue-400">{totalVNC.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-400">FCFA</span></p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400">Actifs opérationnels</p>
            <p className="text-2xl font-bold mt-0.5 text-green-400">
              {assets.filter(a => a.status === 'ACTIVE').length}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un bien..."
            className="flex-1 px-4 py-2 bg-gray-900 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as AssetStatus | 'ALL')}
            className="px-4 py-2 bg-gray-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="IN_MAINTENANCE">En maintenance</option>
            <option value="DISPOSED">Cédé</option>
            <option value="LOST">Perdu</option>
            <option value="STOLEN">Volé</option>
          </select>
        </div>

        {/* Tableau */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">📦</p>
            <p>{search || filterStatus !== 'ALL' ? 'Aucun résultat' : 'Aucun bien enregistré'}</p>
            {!search && filterStatus === 'ALL' && (
              <button onClick={() => setModal({ mode: 'create' })}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors">
                Ajouter le premier bien
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                  <th className="px-4 py-3 font-medium">Bien</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium text-right">VNC (FCFA)</th>
                  <th className="px-4 py-3 font-medium text-right">Prix achat</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(asset => (
                  <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModal({ mode: 'detail', asset })}
                        className="text-left hover:text-blue-400 transition-colors"
                      >
                        <p className="font-medium">{asset.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {asset._count?.locationHistory ?? 0} scan(s)
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{asset.category}</td>
                    <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {asset.tags.length === 0
                          ? <span className="text-gray-600 text-xs">—</span>
                          : asset.tags.map(t => (
                              <span key={t.id} title={`${t.tagType}: ${t.hardwareId}`} className="text-base">
                                {TAG_TYPE_ICON[t.tagType]}
                              </span>
                            ))
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400">
                      {asset.netBookValue.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">
                      {asset.purchasePrice.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal({ mode: 'edit', asset })}
                          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            {modal.mode === 'create' && (
              <>
                <h2 className="text-lg font-bold mb-5">Nouveau bien</h2>
                <AssetForm onSubmit={handleCreate} onCancel={() => setModal(null)} submitLabel="Créer le bien" />
              </>
            )}

            {modal.mode === 'edit' && (
              <>
                <h2 className="text-lg font-bold mb-5">Modifier — {modal.asset.name}</h2>
                <AssetForm
                  initial={modal.asset}
                  onSubmit={(data) => handleEdit(modal.asset.id, data)}
                  onCancel={() => setModal(null)}
                  submitLabel="Sauvegarder"
                />
              </>
            )}

            {modal.mode === 'detail' && (
              <AssetDetail
                asset={modal.asset}
                onClose={() => setModal(null)}
                onEdit={() => setModal({ mode: 'edit', asset: modal.asset })}
                onMap={() => router.push(`/dashboard/map?assetId=${modal.asset.id}`)}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function AssetDetail({
  asset, onClose, onEdit, onMap,
}: {
  asset: Asset;
  onClose: () => void;
  onEdit: () => void;
  onMap: () => void;
}) {
  const deprecPct = asset.purchasePrice > 0
    ? ((1 - asset.netBookValue / asset.purchasePrice) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">{asset.name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{asset.category}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={asset.status} />
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none ml-2">×</button>
        </div>
      </div>

      {asset.photoUrl && (
        <img src={asset.photoUrl} alt={asset.name}
          className="w-full h-40 object-cover rounded-xl border border-white/10" />
      )}

      {/* Données comptables */}
      <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Données comptables</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Prix d'achat</p>
            <p className="font-mono font-semibold">{asset.purchasePrice.toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">VNC actuelle</p>
            <p className="font-mono font-semibold text-blue-400">{asset.netBookValue.toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Amortissement</p>
            <p className="font-semibold">{asset.depreciationYears} ans</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Dépréciation</p>
            <p className="font-semibold text-orange-400">{deprecPct}%</p>
          </div>
        </div>

        {/* Barre de dépréciation */}
        <div className="mt-2">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${100 - parseFloat(deprecPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>VNC résiduelle</span>
            <span>{(100 - parseFloat(deprecPct)).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tags associés ({asset.tags.length})</h3>
        {asset.tags.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun tag — <a href="/dashboard/enroll" className="text-blue-400 hover:underline">Enrôler un tag</a></p>
        ) : (
          asset.tags.map(t => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{TAG_TYPE_ICON[t.tagType]}</span>
                <span className="font-mono text-xs text-gray-300">{t.hardwareId}</span>
              </div>
              <div className="text-right">
                {t.batteryLevel != null && (
                  <span className={`text-xs ${t.batteryLevel < 20 ? 'text-red-400' : 'text-gray-400'}`}>
                    🔋 {t.batteryLevel}%
                  </span>
                )}
                {t.lastSeen && (
                  <p className="text-xs text-gray-500">{new Date(t.lastSeen).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onEdit}
          className="flex-1 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-medium transition-colors">
          Modifier
        </button>
        <button onClick={onMap}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors">
          🗺️ Voir sur la carte
        </button>
      </div>
    </div>
  );
}
