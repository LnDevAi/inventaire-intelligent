'use client';

import { useState } from 'react';
import { AssetStatus, CreateAssetPayload } from '@/lib/types';

const CATEGORIES = [
  'Mobilier', 'Informatique', 'Véhicule', 'Équipement', 'Immobilier', 'Autre',
];

const STATUSES: { value: AssetStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'IN_MAINTENANCE', label: 'En maintenance' },
  { value: 'DISPOSED', label: 'Cédé' },
  { value: 'LOST', label: 'Perdu' },
  { value: 'STOLEN', label: 'Volé' },
];

interface Props {
  initial?: Partial<CreateAssetPayload>;
  onSubmit: (data: CreateAssetPayload) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export default function AssetForm({ initial, onSubmit, onCancel, submitLabel = 'Enregistrer' }: Props) {
  const [form, setForm] = useState<CreateAssetPayload>({
    name: initial?.name ?? '',
    category: initial?.category ?? 'Informatique',
    status: initial?.status ?? 'ACTIVE',
    purchasePrice: initial?.purchasePrice ?? 0,
    purchaseDate: initial?.purchaseDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    depreciationYears: initial?.depreciationYears ?? 5,
    photoUrl: initial?.photoUrl ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof CreateAssetPayload>(key: K, value: CreateAssetPayload[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // VNC prévisionnelle affichée en temps réel
  const yearsElapsed = (Date.now() - new Date(form.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const depreciated = (form.purchasePrice / form.depreciationYears) * Math.min(yearsElapsed, form.depreciationYears);
  const vnc = Math.max(0, form.purchasePrice - depreciated);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  const input = 'w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Nom du bien *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            className={input} placeholder="Ex: Laptop Dell XPS 15" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Catégorie *</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className={input}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Statut</label>
          <select value={form.status} onChange={e => set('status', e.target.value as AssetStatus)} className={input}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Date d'achat *</label>
          <input type="date" required value={form.purchaseDate}
            onChange={e => set('purchaseDate', e.target.value)} className={input} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Prix d'achat (FCFA) *</label>
          <input type="number" required min={0} value={form.purchasePrice}
            onChange={e => set('purchasePrice', parseFloat(e.target.value) || 0)} className={input} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Durée d'amortissement (années) *</label>
          <input type="number" required min={1} max={50} value={form.depreciationYears}
            onChange={e => set('depreciationYears', parseInt(e.target.value) || 1)} className={input} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">URL Photo</label>
          <input value={form.photoUrl} onChange={e => set('photoUrl', e.target.value)}
            className={input} placeholder="https://..." />
        </div>
      </div>

      {/* VNC prévisionnelle */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-3 flex justify-between text-sm">
        <span className="text-gray-400">VNC calculée (valeur nette comptable)</span>
        <span className="text-blue-400 font-semibold">{vnc.toLocaleString('fr-FR')} FCFA</span>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-semibold text-white transition-colors">
          {loading ? 'Enregistrement...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
