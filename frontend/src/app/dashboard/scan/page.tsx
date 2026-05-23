'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveScanOffline, getPendingScans, clearPendingScans } from '@/lib/offline';
import { Asset } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

// BarcodeDetector n'est pas encore dans les types TS standard
declare class BarcodeDetector {
  constructor(opts?: { formats: string[] });
  detect(image: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}

type ScanMode = 'id' | 'qr' | 'search';

interface SessionEntry {
  assetId: string;
  assetName: string;
  siteName: string;
  lat: number;
  lng: number;
  timestamp: string;
  offline: boolean;
}

const TAG_ICON: Record<string, string> = { QR: '⬛', RFID: '📡', BLE: '🔵', GPS: '🛰️' };

export default function ScanPage() {
  const router = useRouter();

  // ── Global ─────────────────────────────────────────────────────────────
  const [assets, setAssets]     = useState<Asset[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending]   = useState(0);
  const [syncing, setSyncing]   = useState(false);

  // ── Mode / identification ───────────────────────────────────────────────
  const [scanMode, setScanMode]       = useState<ScanMode>('id');
  const [hardwareId, setHardwareId]   = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundAsset, setFoundAsset]   = useState<Asset | null>(null);
  const [findError, setFindError]     = useState('');
  const [finding, setFinding]         = useState(false);

  // ── Camera ─────────────────────────────────────────────────────────────
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const rafRef      = useRef<number>(0);
  const [camActive, setCamActive]     = useState(false);
  const [camError, setCamError]       = useState('');
  const [hasBarcodeApi, setHasBarcodeApi] = useState(false);

  // ── Localisation ───────────────────────────────────────────────────────
  const [lat, setLat]               = useState<number | null>(null);
  const [lng, setLng]               = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState('');
  const [siteName, setSiteName]     = useState('');

  // ── Soumission ─────────────────────────────────────────────────────────
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError]     = useState('');
  const [session, setSession]             = useState<SessionEntry[]>([]);

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }

    setHasBarcodeApi('BarcodeDetector' in window);
    setIsOnline(navigator.onLine);

    const onOnline = () => { setIsOnline(true); refreshPending(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    api.get<Asset[]>('/assets').catch(() => router.push('/login')).then(data => {
      if (data) setAssets(data);
    });
    refreshPending();

    return () => {
      stopCamera();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function refreshPending() {
    const scans = await getPendingScans();
    setPending(scans.length);
  }

  // ── Sync manuelle ───────────────────────────────────────────────────────
  async function syncNow() {
    setSyncing(true);
    try {
      const scans = await getPendingScans();
      for (const scan of scans) {
        if (scan.type === 'location') {
          await api.post('/locations', {
            assetId:  scan.assetId,
            latitude:  scan.latitude,
            longitude: scan.longitude,
            siteName:  scan.siteName,
          });
        } else if (scan.type === 'enroll') {
          await api.post('/tags/enroll', {
            assetId:   scan.assetId,
            tagType:   scan.tagType,
            hardwareId: scan.hardwareId,
            ...(scan.batteryLevel != null ? { batteryLevel: scan.batteryLevel } : {}),
          });
        }
      }
      await clearPendingScans();
      setPending(0);
    } catch {
      // Laisse les scans en file si la synchro échoue
    } finally {
      setSyncing(false);
    }
  }

  // ── Recherche d'actif ───────────────────────────────────────────────────
  const findByHardwareId = useCallback((id: string) => {
    const normalized = id.trim().toUpperCase();
    if (!normalized) return;
    setFinding(true);
    setFindError('');
    setFoundAsset(null);

    const tag = assets.flatMap(a => a.tags).find(t => t.hardwareId === normalized);
    const asset = tag ? assets.find(a => a.tags.some(t => t.hardwareId === normalized)) ?? null : null;

    setTimeout(() => {
      if (asset) {
        setFoundAsset(asset);
      } else {
        setFindError(`Aucun tag trouvé pour l'ID « ${normalized} »`);
      }
      setFinding(false);
    }, 200);
  }, [assets]);

  function searchByName(query: string) {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    const asset = assets.find(a =>
      a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
    if (asset) {
      setFoundAsset(asset);
      setFindError('');
    } else {
      setFoundAsset(null);
      setFindError(`Aucun bien trouvé pour « ${query} »`);
    }
  }

  const filteredAssets = searchQuery.length >= 2
    ? assets.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  // ── Caméra QR ──────────────────────────────────────────────────────────
  async function startCamera() {
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamActive(true);
      scanningRef.current = true;

      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const value = codes[0].rawValue.trim().toUpperCase();
            stopCamera();
            setHardwareId(value);
            setScanMode('id');
            findByHardwareId(value);
            return;
          }
        } catch { /* frame non prête */ }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (err) {
      setCamError(err instanceof Error ? err.message : 'Accès caméra refusé');
    }
  }

  function stopCamera() {
    scanningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamActive(false);
  }

  // ── GPS ────────────────────────────────────────────────────────────────
  function captureGps() {
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsLoading(false);
      },
      err => {
        setGpsError(err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  // ── Enregistrement ─────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!foundAsset || !siteName.trim() || lat === null || lng === null) return;
    setSubmitLoading(true);
    setSubmitError('');

    const payload = { assetId: foundAsset.id, latitude: lat, longitude: lng, siteName: siteName.trim() };
    const entry: SessionEntry = {
      assetId: foundAsset.id,
      assetName: foundAsset.name,
      siteName: siteName.trim(),
      lat, lng,
      timestamp: new Date().toISOString(),
      offline: !isOnline,
    };

    try {
      if (!isOnline) {
        await saveScanOffline({ type: 'location', ...payload });
        setPending(p => p + 1);
      } else {
        await api.post('/locations', payload);
      }
      setSession(prev => [entry, ...prev]);
      // Réinitialiser pour le prochain scan
      setFoundAsset(null);
      setHardwareId('');
      setSearchQuery('');
      setLat(null);
      setLng(null);
      setGpsAccuracy(null);
      setSiteName('');
      setFindError('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitLoading(false);
    }
  }

  const canSubmit = !!foundAsset && !!siteName.trim() && lat !== null && lng !== null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Dashboard
          </button>
          <span className="text-white/20">/</span>
          <h1 className="text-xl font-bold">Scan terrain</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-400' : 'text-yellow-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
          {pending > 0 && (
            <button
              onClick={syncNow}
              disabled={!isOnline || syncing}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-50 transition-colors"
            >
              {syncing ? (
                <span className="animate-spin">↻</span>
              ) : (
                <span className="w-4 h-4 flex items-center justify-center bg-yellow-500 text-gray-900 rounded-full text-[10px] font-bold">
                  {pending}
                </span>
              )}
              {syncing ? 'Synchro…' : 'Synchroniser'}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* ── Onglets de mode ── */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { mode: 'id' as ScanMode,     icon: '⌨️',  label: 'ID Matériel' },
            { mode: 'qr' as ScanMode,     icon: '📷',  label: 'QR Caméra' },
            { mode: 'search' as ScanMode, icon: '🔍',  label: 'Recherche' },
          ]).map(tab => (
            <button
              key={tab.mode}
              onClick={() => {
                if (tab.mode !== 'qr') stopCamera();
                setScanMode(tab.mode);
                setFoundAsset(null);
                setFindError('');
                setHardwareId('');
                setSearchQuery('');
              }}
              className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                scanMode === tab.mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 border border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* ── Mode ID matériel ── */}
        {scanMode === 'id' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Saisir ou scanner l'EPC RFID (Chainway C72), l'adresse MAC BLE ou la valeur QR
            </p>
            <div className="flex gap-2">
              <input
                value={hardwareId}
                onChange={e => setHardwareId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && findByHardwareId(hardwareId)}
                placeholder="Ex: E2804000000000000000000A"
                className="flex-1 px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => findByHardwareId(hardwareId)}
                disabled={!hardwareId.trim() || finding}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-semibold text-sm transition-colors"
              >
                {finding ? '…' : '→'}
              </button>
            </div>
          </div>
        )}

        {/* ── Mode QR caméra ── */}
        {scanMode === 'qr' && (
          <div className="space-y-3">
            {!hasBarcodeApi ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm text-yellow-300">
                ⚠️ L'API BarcodeDetector n'est pas disponible sur ce navigateur.
                Utilisez Chrome ou Edge, ou passez en mode « ID Matériel ».
              </div>
            ) : camActive ? (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video ref={videoRef} playsInline muted className="w-full rounded-xl" />
                {/* Viseur */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-blue-400 rounded-xl opacity-70" />
                </div>
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="text-xs text-blue-300 bg-black/50 px-3 py-1 rounded-full">
                    Pointez le QR Code vers la caméra
                  </span>
                </div>
                <button
                  onClick={stopCamera}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  ✕ Arrêter
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={startCamera}
                  className="w-full py-10 bg-gray-900 border border-white/10 hover:border-blue-500/40 rounded-xl flex flex-col items-center gap-3 transition-colors"
                >
                  <span className="text-4xl">📷</span>
                  <span className="font-semibold">Activer la caméra</span>
                  <span className="text-xs text-gray-500">Caméra arrière — détection automatique QR</span>
                </button>
                {camError && (
                  <p className="mt-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {camError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Mode recherche ── */}
        {scanMode === 'search' && (
          <div className="space-y-3">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Nom du bien ou catégorie…"
              className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filteredAssets.length > 0 && (
              <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                {filteredAssets.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setFoundAsset(a); setSearchQuery(a.name); setFindError(''); }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.category}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && filteredAssets.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Aucun résultat</p>
            )}
          </div>
        )}

        {/* ── Erreur de recherche ── */}
        {findError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {findError}
          </p>
        )}

        {/* ── Bien trouvé ── */}
        {foundAsset && (
          <div className="bg-gray-900 border border-green-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-green-400 font-medium mb-1">✓ Bien identifié</p>
                <h2 className="font-bold text-lg leading-tight">{foundAsset.name}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{foundAsset.category}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={foundAsset.status} />
                <button
                  onClick={() => { setFoundAsset(null); setHardwareId(''); setSearchQuery(''); }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Changer
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-1 border-t border-white/10">
              <span className="text-gray-400">VNC</span>
              <span className="font-mono text-blue-400 font-semibold">
                {foundAsset.netBookValue.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            {foundAsset.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {foundAsset.tags.map(t => (
                  <span key={t.id} className="flex items-center gap-1 text-xs bg-white/5 rounded-lg px-2 py-1">
                    {TAG_ICON[t.tagType]}
                    <span className="font-mono text-gray-400">{t.hardwareId.slice(-8)}</span>
                    {t.batteryLevel != null && (
                      <span className={t.batteryLevel < 20 ? 'text-red-400' : 'text-gray-500'}>
                        · 🔋{t.batteryLevel}%
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Localisation (visible seulement quand un bien est trouvé) ── */}
        {foundAsset && (
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold">Localisation</h3>

            {/* GPS */}
            <div>
              <button
                onClick={captureGps}
                disabled={gpsLoading}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  lat !== null
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {gpsLoading ? (
                  <><span className="animate-spin">↻</span> Localisation GPS…</>
                ) : lat !== null ? (
                  <>📍 GPS capturé · précision ±{gpsAccuracy}m</>
                ) : (
                  <>📍 Capturer la position GPS</>
                )}
              </button>

              {lat !== null && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 font-mono">
                  <span>Lat : {lat.toFixed(6)}</span>
                  <span>Lng : {lng?.toFixed(6)}</span>
                </div>
              )}

              {gpsError && (
                <p className="mt-2 text-xs text-red-400">{gpsError}</p>
              )}
            </div>

            {/* Site name */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Nom du site / emplacement *
              </label>
              <input
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                placeholder="Ex: Salle serveur B2, Entrepôt Nord, Bureau DG…"
                className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mode offline notice */}
            {!isOnline && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-xs text-yellow-300">
                ⚠️ Mode hors ligne — la localisation sera synchronisée dès la reconnexion.
              </div>
            )}

            {submitError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {submitError}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitLoading}
              className="w-full py-3.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-xl font-bold text-sm transition-colors"
            >
              {submitLoading
                ? 'Enregistrement…'
                : isOnline
                  ? '✓ Enregistrer la localisation'
                  : '⏳ Mettre en file hors ligne'}
            </button>
          </div>
        )}

        {/* ── Historique de session ── */}
        {session.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Session en cours — {session.length} scan(s)
            </p>
            <div className="space-y-2">
              {session.map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                    entry.offline
                      ? 'border-yellow-500/20 bg-yellow-500/5'
                      : 'border-white/5 bg-gray-900'
                  }`}
                >
                  <div>
                    <p className="font-medium">{entry.assetName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      📍 {entry.siteName} · {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {entry.offline && <p className="text-xs text-yellow-400 mt-0.5">⏳ En attente</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
