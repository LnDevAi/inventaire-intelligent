import { AssetStatus } from '@/lib/types';

const config: Record<AssetStatus, { label: string; classes: string }> = {
  ACTIVE:         { label: 'Actif',            classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
  IN_MAINTENANCE: { label: 'En maintenance',   classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  DISPOSED:       { label: 'Cédé',             classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  LOST:           { label: 'Perdu',            classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  STOLEN:         { label: 'Volé',             classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default function StatusBadge({ status }: { status: AssetStatus }) {
  const { label, classes } = config[status] ?? config.ACTIVE;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${classes}`}>
      {label}
    </span>
  );
}
