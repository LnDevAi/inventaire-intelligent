'use client';

interface ExportableAsset {
  name: string;
  category: string;
  status: string;
  purchasePrice: number;
  netBookValue: number;
  purchaseDate: string | Date;
}

interface ExportButtonProps {
  assets: ExportableAsset[];
  filename?: string;
}

export default function ExportButton({ assets, filename = 'assets' }: ExportButtonProps) {
  function handleExport() {
    const headers = ['Nom', 'Catégorie', 'Statut', "Prix d'achat (FCFA)", 'VNC (FCFA)', "Date d'achat"];
    const rows = assets.map((a) => [
      a.name,
      a.category,
      a.status,
      a.purchasePrice.toFixed(0),
      a.netBookValue.toFixed(0),
      new Date(a.purchaseDate).toLocaleDateString('fr-FR'),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const bom = '﻿';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={assets.length === 0}
      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Exporter CSV ({assets.length})
    </button>
  );
}
