'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AssetStatus, LocationHistory } from '@/lib/types';

// Fix webpack icon path resolution
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLOR: Record<AssetStatus, string> = {
  ACTIVE: '#22c55e',
  IN_MAINTENANCE: '#eab308',
  DISPOSED: '#6b7280',
  LOST: '#f97316',
  STOLEN: '#ef4444',
};

function pinIcon(color: string, selected: boolean) {
  const r = selected ? 10 : 7;
  const d = r * 2 + 4;
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}">
      <circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="${color}" stroke="white" stroke-width="2.5"/>
      ${selected ? `<circle cx="${d / 2}" cy="${d / 2}" r="${r - 4}" fill="white" opacity="0.35"/>` : ''}
    </svg>`,
    className: '',
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
    popupAnchor: [0, -(d / 2)],
  });
}

function dotIcon(opacity: number) {
  return L.divIcon({
    html: `<div style="width:7px;height:7px;background:#3b82f6;border:1.5px solid white;border-radius:50%;opacity:${opacity}"></div>`,
    className: '',
    iconSize: [7, 7],
    iconAnchor: [3.5, 3.5],
  });
}

function BoundsUpdater({ positions, fitKey }: { positions: [number, number][]; fitKey: string }) {
  const map = useMap();
  const lastKey = useRef('');
  useEffect(() => {
    if (fitKey !== lastKey.current && positions.length > 0) {
      lastKey.current = fitKey;
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 15 });
    }
  });
  return null;
}

export interface AssetPin {
  assetId: string;
  name: string;
  status: AssetStatus;
  tagType: string;
  locations: LocationHistory[];
}

interface Props {
  pins: AssetPin[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}

export default function LeafletMap({ pins, selectedAssetId, onSelectAsset }: Props) {
  const DEFAULT_CENTER: [number, number] = [12.3641, -1.5337]; // Ouagadougou

  const selected = pins.find(p => p.assetId === selectedAssetId);
  const trail: [number, number][] = (selected?.locations ?? []).map(l => [l.latitude, l.longitude]);

  const allLastPositions: [number, number][] = pins
    .map(p => p.locations.at(-1))
    .filter((l): l is LocationHistory => !!l)
    .map(l => [l.latitude, l.longitude]);

  const boundsPositions = trail.length > 0 ? trail : allLastPositions;
  const fitKey = selectedAssetId ?? 'all';

  return (
    <MapContainer
      center={allLastPositions[0] ?? DEFAULT_CENTER}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl overflow-hidden"
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <BoundsUpdater positions={boundsPositions} fitKey={fitKey} />

      {/* Trail polyline for selected asset */}
      {trail.length > 1 && (
        <Polyline positions={trail} color="#3b82f6" weight={3} opacity={0.75} dashArray="8 5" />
      )}

      {/* History dots (older points) for selected asset */}
      {selected?.locations.slice(0, -1).map((loc, i) => {
        const opacity = 0.3 + 0.5 * (i / Math.max(selected.locations.length - 2, 1));
        return (
          <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={dotIcon(opacity)}>
            <Popup>
              <div className="text-xs space-y-0.5">
                <p className="font-medium">{loc.siteName}</p>
                <p className="text-gray-500">{new Date(loc.timestamp).toLocaleString('fr-FR')}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Main marker — last position for each asset */}
      {pins.map(pin => {
        const last = pin.locations.at(-1);
        if (!last) return null;
        const isSelected = pin.assetId === selectedAssetId;
        return (
          <Marker
            key={pin.assetId}
            position={[last.latitude, last.longitude]}
            icon={pinIcon(STATUS_COLOR[pin.status] ?? '#6b7280', isSelected)}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ click: () => onSelectAsset(pin.assetId) }}
          >
            <Popup>
              <div className="text-sm space-y-1 min-w-36">
                <p className="font-semibold">{pin.name}</p>
                <p className="text-gray-500 text-xs">{last.siteName}</p>
                <p className="text-gray-400 text-xs">{new Date(last.timestamp).toLocaleString('fr-FR')}</p>
                <p className="text-blue-500 text-xs">{pin.locations.length} point(s)</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
