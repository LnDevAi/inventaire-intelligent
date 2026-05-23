'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { Asset, LocationHistory } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import type { AssetPin } from '@/components/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false });

const TAG_ICON: Record<string, string> = {
  GPS: '🛰️', BLE: '🔵', RFID: '📡', QR: '⬛',
};

function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initAssetId = searchParams.get('assetId');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [pins, setPins] = useState<AssetPin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initAssetId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }

    api.get<Asset[]>('/assets')
      .then(async data => {
        setAssets(data);
        const tagged = data.filter(a => a.tags.length > 0);

        const results = await Promise.all(
          tagged.map(async a => {
            try {
              const locs = await api.get<LocationHistory[]>(`/locations/asset/${a.id}?limit=100`);
              return {
                assetId: a.id,
                name: a.name,
                status: a.status,
                tagType: a.tags.find(t => t.tagType === 'GPS' || t.tagType === 'BLE')?.tagType
                  ?? a.tags[0]?.tagType
                  ?? 'GPS',
                locations: locs,
              } as AssetPin;
            } catch {
              return null;
            }
          })
        );

        setPins(results.filter((p): p is AssetPin => p !== null && p.locations.length > 0));
        setLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const selectedPin = pins.find(p => p.assetId === selectedId);

  return (
    <main className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Dashboard
          </button>
          <span className="text-white/20">/</span>
          <h1 className="text-xl font-bold">Carte GPS</h1>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-xs text-gray-500 animate-pulse">Chargement...</span>
          )}
          <span className="text-xs text-gray-500">
            {pins.length} bien(s) localisé(s) · {assets.length} total
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-white/10 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Actifs localisés</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : pins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <p className="text-3xl mb-3">🛰️</p>
                <p className="text-sm text-gray-400">Aucune localisation disponible</p>
                <p className="text-xs text-gray-600 mt-1">
                  Les tags GPS et BLE remontent automatiquement leurs positions.
                </p>
                <button
                  onClick={() => router.push('/dashboard/enroll')}
                  className="mt-4 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Enrôler un tag
                </button>
              </div>
            ) : (
              pins.map(pin => {
                const last = pin.locations.at(-1);
                const isSelected = pin.assetId === selectedId;
                return (
                  <button
                    key={pin.assetId}
                    onClick={() => handleSelect(pin.assetId)}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                      isSelected
                        ? 'bg-blue-500/10 border-l-2 border-l-blue-500 pl-3.5'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{pin.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{last?.siteName ?? '—'}</p>
                        {last && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            {new Date(last.timestamp).toLocaleString('fr-FR', {
                              day: '2-digit', month: 'short',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-base">{TAG_ICON[pin.tagType] ?? '📍'}</span>
                        <StatusBadge status={pin.status} />
                      </div>
                    </div>
                    {isSelected && (
                      <p className="text-xs text-blue-400 mt-1.5">
                        {pin.locations.length} point(s) · cliquer sur la carte
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          {!loading && pins.length > 0 && (
            <div className="px-4 py-3 border-t border-white/10 text-xs text-gray-600">
              Cliquer un actif pour voir son historique de déplacements
            </div>
          )}
        </aside>

        {/* Map area */}
        <div className="flex-1 relative bg-gray-900">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse">
              Chargement de la carte...
            </div>
          ) : (
            <div className="absolute inset-0 p-3">
              <LeafletMap
                pins={pins}
                selectedAssetId={selectedId}
                onSelectAsset={handleSelect}
              />
            </div>
          )}

          {/* Selected asset info overlay */}
          {selectedPin && !loading && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-sm z-[1000] shadow-xl">
              <div className="flex items-center gap-2">
                <span>{TAG_ICON[selectedPin.tagType] ?? '📍'}</span>
                <span className="font-semibold">{selectedPin.name}</span>
                <StatusBadge status={selectedPin.status} />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedPin.locations.length} point(s) de passage ·{' '}
                {selectedPin.locations.at(-1)?.siteName ?? ''}
              </p>
              {selectedPin.locations.length > 1 && (
                <p className="text-xs text-blue-400 mt-0.5">
                  Premier scan : {new Date(selectedPin.locations[0].timestamp).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          )}

          {/* Legend */}
          {!loading && pins.length > 0 && (
            <div className="absolute top-6 right-6 bg-gray-900/80 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 text-xs z-[1000] space-y-1">
              {[
                { color: '#22c55e', label: 'Actif' },
                { color: '#eab308', label: 'Maintenance' },
                { color: '#f97316', label: 'Perdu' },
                { color: '#ef4444', label: 'Volé' },
                { color: '#6b7280', label: 'Cédé' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="4" fill={color} stroke="white" strokeWidth="1.5" />
                  </svg>
                  <span className="text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-gray-950 flex items-center justify-center text-gray-400 animate-pulse">
          Chargement de la carte...
        </div>
      }
    >
      <MapContent />
    </Suspense>
  );
}
