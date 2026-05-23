'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveScanOffline } from '@/lib/offline';
import { Asset, TagType } from '@/lib/types';

const TAG_TYPES: { value: TagType; label: string; desc: string; icon: string }[] = [
  { value: 'QR',   label: 'QR Code',   desc: 'Autocollant imprimé — scan caméra',        icon: '⬛' },
  { value: 'RFID', label: 'RFID',      desc: 'Sticker UHF passif 865-868 MHz',            icon: '📡' },
  { value: 'BLE',  label: 'BLE',       desc: 'Tag Bluetooth Jimi IoT Série PB',           icon: '🔵' },
  { value: 'GPS',  label: 'GPS',       desc: 'Balise Teltonika LTE Cat-1 (véhicule/engin)', icon: '🛰️' },
];

type Step = 'type' | 'hardware' | 'asset' | 'confirm' | 'done';

export default function EnrollPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [step, setStep] = useState<Step>('type');

  const [tagType, setTagType] = useState<TagType>('RFID');
  const [hardwareId, setHardwareId] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<number | ''>('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    setIsOnline(navigator.onLine);
    window.addEventListener('online',  () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    api.get<Asset[]>('/assets').then(setAssets).catch(() => router.push('/login'));
    return () => {
      window.removeEventListener('online',  () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, [router]);

  const filteredAssets = assets.filter(a =>
    a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.category.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  const reset = useCallback(() => {
    setStep('type');
    setHardwareId('');
    setBatteryLevel('');
    setSelectedAssetId('');
    setAssetSearch('');
    setError('');
  }, []);

  async function enroll() {
    setLoading(true);
    setError('');
    const payload = {
      assetId: selectedAssetId,
      tagType,
      hardwareId: hardwareId.trim().toUpperCase(),
      ...(batteryLevel !== '' ? { batteryLevel: Number(batteryLevel) } : {}),
    };

    try {
      if (!isOnline) {
        await saveScanOffline({ type: 'enroll', ...payload });
        setStep('done');
        return;
      }
      await api.post('/tags/enroll', payload);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enrôlement');
    } finally {
      setLoading(false);
    }
  }

  const stepBar = ['type', 'hardware', 'asset', 'confirm'];
  const stepIdx = stepBar.indexOf(step);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Dashboard
          </button>
          <span className="text-white/20">/</span>
          <h1 className="text-xl font-bold">Enrôlement de tag</h1>
        </div>
        <span className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-400' : 'text-yellow-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          {isOnline ? 'En ligne' : 'Hors ligne — enrôlement mis en file'}
        </span>
      </header>

      <div className="max-w-xl mx-auto px-6 py-8">
        {/* Barre de progression */}
        {step !== 'done' && (
          <div className="flex items-center gap-2 mb-8">
            {['Type', 'ID matériel', 'Bien', 'Confirmer'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors
                  ${i < stepIdx ? 'bg-blue-600 border-blue-600 text-white'
                  : i === stepIdx ? 'border-blue-500 text-blue-400'
                  : 'border-white/20 text-gray-600'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === stepIdx ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                {i < 3 && <div className={`flex-1 h-px ${i < stepIdx ? 'bg-blue-600' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Étape 1 — Type de tag */}
        {step === 'type' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Quel type de tag ?</h2>
            <div className="grid grid-cols-2 gap-3">
              {TAG_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTagType(t.value)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    tagType === t.value
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 hover:border-white/30 bg-gray-900'
                  }`}
                >
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('hardware')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
            >
              Continuer →
            </button>
          </div>
        )}

        {/* Étape 2 — ID matériel */}
        {step === 'hardware' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Identifiant matériel du tag</h2>
              <p className="text-sm text-gray-400 mt-1">
                {tagType === 'RFID' && 'EPC gravé sur la puce — visible dans le logiciel du lecteur Chainway C72'}
                {tagType === 'BLE'  && 'MAC address du beacon Jimi IoT — format XX:XX:XX:XX:XX:XX'}
                {tagType === 'GPS'  && 'IMEI de la balise Teltonika — 15 chiffres sous le boîtier'}
                {tagType === 'QR'   && 'Valeur encodée dans le QR Code — scanner ou saisir manuellement'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Hardware ID *</label>
              <input
                value={hardwareId}
                onChange={e => setHardwareId(e.target.value.toUpperCase())}
                placeholder={
                  tagType === 'BLE'  ? 'AA:BB:CC:DD:EE:FF' :
                  tagType === 'GPS'  ? '352093081234567' :
                  tagType === 'RFID' ? 'E2804000000000000000000A' :
                  'ASSET-001-QR'
                }
                className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {(tagType === 'BLE' || tagType === 'GPS') && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Niveau batterie (%) — optionnel</label>
                <input
                  type="number" min={0} max={100}
                  value={batteryLevel}
                  onChange={e => setBatteryLevel(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="Ex: 87"
                  className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('type')} className="flex-1 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-sm transition-colors">
                ← Retour
              </button>
              <button
                onClick={() => setStep('asset')}
                disabled={!hardwareId.trim()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-semibold transition-colors"
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 — Sélection du bien */}
        {step === 'asset' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Associer à quel bien ?</h2>
            <input
              value={assetSearch}
              onChange={e => setAssetSearch(e.target.value)}
              placeholder="Rechercher un bien..."
              className="w-full px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredAssets.length === 0
                ? <p className="text-center text-gray-500 py-6">Aucun bien trouvé</p>
                : filteredAssets.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAssetId(a.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                      selectedAssetId === a.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/30 bg-gray-900'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.category} · {a.tags.length} tag(s)</p>
                    </div>
                    <span className="text-xs font-mono text-blue-400">{a.netBookValue.toLocaleString('fr-FR')} FCFA</span>
                  </button>
                ))
              }
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('hardware')} className="flex-1 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-sm transition-colors">
                ← Retour
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedAssetId}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-semibold transition-colors"
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 — Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Confirmer l'enrôlement</h2>

            <div className="bg-gray-900 border border-white/10 rounded-xl divide-y divide-white/5">
              {[
                { label: 'Type de tag',    value: TAG_TYPES.find(t => t.value === tagType)?.label ?? tagType },
                { label: 'Hardware ID',    value: hardwareId },
                { label: 'Bien associé',   value: selectedAsset?.name ?? '—' },
                { label: 'Catégorie',      value: selectedAsset?.category ?? '—' },
                ...(batteryLevel !== '' ? [{ label: 'Batterie', value: `${batteryLevel}%` }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-400">{row.label}</span>
                  <span className="font-medium font-mono">{row.value}</span>
                </div>
              ))}
            </div>

            {!isOnline && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm text-yellow-300">
                ⚠️ Mode hors ligne — l'enrôlement sera synchronisé au retour de la connexion.
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('asset')} className="flex-1 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-sm transition-colors">
                ← Retour
              </button>
              <button
                onClick={enroll}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-semibold transition-colors"
              >
                {loading ? 'Enrôlement...' : '✓ Confirmer'}
              </button>
            </div>
          </div>
        )}

        {/* Succès */}
        {step === 'done' && (
          <div className="text-center space-y-5 py-8">
            <div className="text-6xl">{isOnline ? '✅' : '⏳'}</div>
            <h2 className="text-xl font-bold">
              {isOnline ? 'Tag enrôlé avec succès !' : 'Enrôlement mis en file d\'attente'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isOnline
                ? `Le tag ${hardwareId} est maintenant associé à ${selectedAsset?.name}.`
                : 'Le tag sera enrôlé automatiquement dès la reconnexion au réseau.'}
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={reset}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
              >
                Enrôler un autre tag
              </button>
              <button
                onClick={() => router.push('/dashboard/assets')}
                className="w-full py-3 border border-white/10 hover:bg-white/5 rounded-xl text-sm transition-colors"
              >
                Voir les biens
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
