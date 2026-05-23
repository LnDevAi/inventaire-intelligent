'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT';
  companyId: string;
  company: { name: string; country: string; subscriptionPlan: string };
  _count: { locationsCaptured: number };
}

const ROLE_META = {
  ADMIN:   { label: 'Administrateur', cls: 'text-red-400   bg-red-500/10   border-red-500/20'   },
  MANAGER: { label: 'Gestionnaire',   cls: 'text-blue-400  bg-blue-500/10  border-blue-500/20'  },
  AGENT:   { label: 'Agent terrain',  cls: 'text-green-400 bg-green-500/10 border-green-500/20' },
};

const PLAN_LABEL: Record<string, string> = {
  FREE: 'Gratuit', STARTER: 'Starter', PRO: 'Pro', ENTERPRISE: 'Entreprise',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);

  // Edit profile state
  const [editName, setEditName]   = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');
  const [saveError, setSaveError] = useState('');

  // Change password state
  const [curPwd, setCurPwd]   = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg]       = useState('');
  const [pwdError, setPwdError]   = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    api.get<UserProfile>('/auth/me')
      .then(p => {
        setProfile(p);
        setEditName(p.name);
        setEditEmail(p.email);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      const updated = await api.patch<UserProfile>('/auth/me', {
        name:  editName.trim()  !== profile.name  ? editName.trim()  : undefined,
        email: editEmail.trim() !== profile.email ? editEmail.trim() : undefined,
      });
      setProfile(prev => prev ? { ...prev, ...updated } : prev);
      setSaveMsg('Profil mis à jour');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== newPwd2) { setPwdError('Les mots de passe ne correspondent pas'); return; }
    setPwdSaving(true);
    setPwdMsg('');
    setPwdError('');
    try {
      await api.patch('/auth/me', { currentPassword: curPwd, newPassword: newPwd });
      setPwdMsg('Mot de passe modifié');
      setCurPwd('');
      setNewPwd('');
      setNewPwd2('');
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPwdSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const role = ROLE_META[profile.role] ?? ROLE_META.AGENT;
  const input = 'w-full px-4 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Dashboard
          </button>
          <span className="text-white/20">/</span>
          <h1 className="text-xl font-bold">Profil</h1>
        </div>
        <button onClick={logout}
          className="text-sm text-red-400 hover:text-red-300 transition-colors">
          Déconnexion
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* ── Carte identité ── */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold shrink-0">
            {initials(profile.name)}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{profile.name}</h2>
            <p className="text-gray-400 text-sm mt-0.5 truncate">{profile.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${role.cls}`}>
                {role.label}
              </span>
              <span className="text-xs text-gray-500">
                {PLAN_LABEL[profile.company.subscriptionPlan] ?? profile.company.subscriptionPlan}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-2xl font-bold">{profile._count.locationsCaptured}</p>
            <p className="text-xs text-gray-500 mt-0.5">scan(s) terrain</p>
          </div>
        </div>

        {/* ── Informations société ── */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Société</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Nom</p>
              <p className="font-medium mt-0.5">{profile.company.name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Pays</p>
              <p className="font-medium mt-0.5">{profile.company.country}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Plan</p>
              <p className="font-medium mt-0.5">
                {PLAN_LABEL[profile.company.subscriptionPlan] ?? profile.company.subscriptionPlan}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">ID entreprise</p>
              <p className="font-mono text-xs text-gray-400 mt-0.5 truncate">{profile.companyId}</p>
            </div>
          </div>
        </div>

        {/* ── Modifier le profil ── */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Modifier le profil</h3>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom complet</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
                className={input}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Adresse e-mail</label>
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                required
                className={input}
              />
            </div>

            {saveMsg && (
              <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
                ✓ {saveMsg}
              </p>
            )}
            {saveError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {saveError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || (editName.trim() === profile.name && editEmail.trim() === profile.email)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Changer le mot de passe ── */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Changer le mot de passe</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Mot de passe actuel</label>
              <input
                type="password"
                value={curPwd}
                onChange={e => setCurPwd(e.target.value)}
                required
                autoComplete="current-password"
                className={input}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 caractères"
                className={input}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={newPwd2}
                onChange={e => setNewPwd2(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={`${input} ${newPwd2 && newPwd !== newPwd2 ? 'ring-2 ring-red-500 border-red-500/50' : ''}`}
              />
              {newPwd2 && newPwd !== newPwd2 && (
                <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {pwdMsg && (
              <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
                ✓ {pwdMsg}
              </p>
            )}
            {pwdError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {pwdError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwdSaving || !curPwd || !newPwd || newPwd !== newPwd2}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-sm font-semibold transition-colors"
              >
                {pwdSaving ? 'Modification…' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Zone danger ── */}
        <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-5">
          <h3 className="font-semibold text-red-400 mb-1">Déconnexion</h3>
          <p className="text-sm text-gray-500 mb-4">
            Votre session sera supprimée de cet appareil.
          </p>
          <button
            onClick={logout}
            className="px-5 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition-colors"
          >
            Se déconnecter
          </button>
        </div>

      </div>
    </main>
  );
}
