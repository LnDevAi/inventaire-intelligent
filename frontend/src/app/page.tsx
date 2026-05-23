import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/25 text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Plateforme SaaS multi-tenant — E-DEFENCE
        </div>

        <h1 className="text-5xl font-bold tracking-tight">
          Inventaire Intelligent
        </h1>

        <p className="text-gray-400 text-lg leading-relaxed">
          Gestion et traçabilité des actifs d'entreprise — RFID, NFC, BLE, GPS.
          Zéro saisie manuelle. Conformité comptable automatisée.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-white/10 hover:bg-white/5 rounded-xl font-semibold transition-colors"
          >
            Tableau de bord
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-gray-500">
          {['RFID/NFC', 'BLE Jimi IoT', 'GPS Teltonika', 'Offline-First', 'AES-256', 'Multi-tenant'].map(tag => (
            <span key={tag} className="px-2 py-1 bg-white/5 rounded-md">{tag}</span>
          ))}
        </div>
      </div>
    </main>
  );
}
