export type AssetStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'DISPOSED' | 'LOST' | 'STOLEN';
export type TagType = 'QR' | 'RFID' | 'BLE' | 'GPS';
export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT';

export interface Tag {
  id: string;
  tagType: TagType;
  hardwareId: string;
  batteryLevel: number | null;
  lastSeen: string | null;
}

export interface Asset {
  id: string;
  companyId: string;
  name: string;
  category: string;
  status: AssetStatus;
  photoUrl: string | null;
  purchasePrice: number;
  purchaseDate: string;
  depreciationYears: number;
  netBookValue: number;
  createdAt: string;
  tags: Tag[];
  _count?: { locationHistory: number };
}

export interface LocationHistory {
  id: string;
  assetId: string;
  latitude: number;
  longitude: number;
  siteName: string;
  capturedBy: string;
  timestamp: string;
}

export interface CreateAssetPayload {
  name: string;
  category: string;
  status?: AssetStatus;
  purchasePrice: number;
  purchaseDate: string;
  depreciationYears: number;
  photoUrl?: string;
}
