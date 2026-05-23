'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  createdAt: string;
  _count: { locationsCaptured: number };
}

interface CreatePayload { name: string; email: string; password: string; role: UserRole }

const ROLE_META: Record<UserRole, { label: string; cls: string }> = {
  ADMIN:   { label: 'Administrateur', cls: 'text-red-400   bg-red-500/10   border-red-500/20'   },
  MANAGER: { label: 'Gestionnaire',   cls: 'text-blue-400  bg-blue-500/10  border-blue-500/20'  },
  AGENT:   { label: 'Agent terrain',  cls: 'text-green-400 bg-green-500/10 border-green-500/20' },
};

function decodeJwt(token: string): { sub: string; role: string } | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers]         = useState<ManagedUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentId, setCurrentId] = useState('');
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState<CreatePayload>({ name: '', email: '', password: '', role: 'AGENT' });
  const [inviting, setInviting]   = useState(false);
  const [inviteErr, setInviteErr] = useState('');

  // Role edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole]   = useState<UserRole>('AGENT');
  const [roleLoading, setRoleLoading] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<ManagedUser[]>('/users');
      setUsers(data);
    } catch {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const payload = decodeJwt(token);
    if (payload?.role !== 'ADMIN') { router.push('/dashboard'); return; }
    setCurrentId(payload.sub);
    load().finally(() => setLoading(false));
  }, [router, load]);

  // ── Filtres ────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const byRole = (role: UserRole) => users.filter(u => u.role === role).length;

  // ── Invite user ────────────────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteErr('');
    try {
      await api.post('/users', form);
      setShowInvite(false);
      setForm({ name: '', email: '', password: '', role: 'AGENT' });
      await load();
    } catch (err) {
      setInviteErr(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setInviting(false);
    }
  }

  // ── Edit role ──────────────────────────────────────────────────────────
  async function handleRoleSave(userId: string) {
    setRoleLoading(true);
    try {
      await api.patch(`/users/${userId}`, { role: editRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: editRole } : u));
      setEditingId(null);
    } catch { /* ignore */ }
    finally { setRoleLoading(false); }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  async function handleDelete(userId: string) {
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeletingId(null);
    } catch { /* ignore */ }
    finally { setDeleteLoading(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const input = 'px-4 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">Administration</h1>
          <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-md px-2 py-0.5">
            ADMIN
          </span>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteErr(''); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors"
        >
          + Inviter un utilisateur
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total',          value: users.length, cls: 'text-white'      },
            { label: 'Administrateurs', value: byRole('ADMIN'),   cls: 'text-red-400'   },
            { label: 'Gestionnaires',  value: byRole('MANAGER'), cls: 'text-blue-400'  },
            { label: 'Agents terrain', value: byRole('AGENT'),   cls: 'text-green-400' },
          ].map(k => (
            <div key={k.label} className="bg-gray-900 border border-white/10 rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.cls}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filtres ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className={`flex-1 ${input}`}
          />
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value as UserRole | 'ALL')}
            className={input}
          >
            <option value="ALL">Tous les rôles</option>
            <option value="ADMIN">Administrateur</option>
            <option value="MANAGER">Gestionnaire</option>
            <option value="AGENT">Agent terrain</option>
          </select>
        </div>

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-3xl mb-3">👤</p>
            <p>{search || filterRole !== 'ALL' ? 'Aucun résultat' : 'Aucun utilisateur'}</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                  <th className="px-4 py-3 font-medium">Utilisateur</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium text-center">Scans</th>
                  <th className="px-4 py-3 font-medium">Depuis</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(user => {
                  const isSelf    = user.id === currentId;
                  const isEditing = editingId === user.id;
                  const meta      = ROLE_META[user.role];

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Utilisateur */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(user.name)}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.name}
                              {isSelf && <span className="ml-2 text-xs text-blue-400">(vous)</span>}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Rôle */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editRole}
                              onChange={e => setEditRole(e.target.value as UserRole)}
                              className="px-2 py-1 bg-gray-800 border border-white/20 rounded-lg text-xs text-white focus:outline-none"
                            >
                              <option value="ADMIN">Administrateur</option>
                              <option value="MANAGER">Gestionnaire</option>
                              <option value="AGENT">Agent terrain</option>
                            </select>
                            <button
                              onClick={() => handleRoleSave(user.id)}
                              disabled={roleLoading}
                              className="text-xs text-green-400 hover:text-green-300 font-medium"
                            >
                              {roleLoading ? '…' : '✓'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs text-gray-500 hover:text-gray-300"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${meta.cls}`}>
                            {meta.label}
                          </span>
                        )}
                      </td>

                      {/* Scans */}
                      <td className="px-4 py-3 text-center font-mono text-gray-400">
                        {user._count.locationsCaptured}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!isSelf && !isEditing && (
                            <button
                              onClick={() => { setEditingId(user.id); setEditRole(user.role); }}
                              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
                            >
                              Rôle
                            </button>
                          )}
                          {!isSelf && deletingId !== user.id && (
                            <button
                              onClick={() => setDeletingId(user.id)}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                            >
                              Supprimer
                            </button>
                          )}
                          {deletingId === user.id && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-400">Confirmer ?</span>
                              <button
                                onClick={() => handleDelete(user.id)}
                                disabled={deleteLoading}
                                className="text-xs text-red-400 hover:text-red-300 font-semibold"
                              >
                                {deleteLoading ? '…' : 'Oui'}
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="text-xs text-gray-500 hover:text-gray-300"
                              >
                                Non
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal invitation ── */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Inviter un utilisateur</h2>
              <button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom complet *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jean Dupont"
                  className={`w-full ${input}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Adresse e-mail *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jean@entreprise.com"
                  className={`w-full ${input}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Mot de passe temporaire *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 8 caractères"
                  className={`w-full ${input}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Rôle</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className={`w-full ${input}`}
                >
                  <option value="AGENT">Agent terrain</option>
                  <option value="MANAGER">Gestionnaire</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              {inviteErr && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  {inviteErr}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
                >
                  {inviting ? 'Création…' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
