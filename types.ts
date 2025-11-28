export enum FileType {
  FOLDER = 'application/vnd.google-apps.folder',
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  UNKNOWN = 'UNKNOWN'
}

export interface FileSystemItem {
  id: string;
  parentId: string | null;
  name: string;
  mimeType: string;
  thumbnail?: string;
  size?: string;
  createdAt?: string; // ISO string
  description?: string;
  url?: string;
  shortcutDetails?: {
    targetId: string;
    targetMimeType: string;
  };
}

export interface User {
  email: string;
  name: string;
  picture?: string;
}

export interface StorageQuota {
  limit: string;
  usage: string;
  usageInDrive: string;
  usageInTrash: string;
}

export interface WatchHistoryItem {
  fileId: string;
  timestamp: number; // Unix timestamp of when it was last watched
  progress: number; // Seconds watched
  duration: number; // Total duration in seconds
  // Cached metadata so we can display history without fetching from Drive
  name?: string;
  mimeType?: string;
  thumbnail?: string;
  size?: string;
}

export interface DriveConfig {
  clientId: string;
  apiKey: string;
}

// Helper to map MIME types to our simplified Enum for UI logic
export const getFileType = (mimeType: string | undefined): FileType => {
  if (!mimeType) return FileType.UNKNOWN;
  if (mimeType === 'application/vnd.google-apps.folder') return FileType.FOLDER;
  if (mimeType.startsWith('video/')) return FileType.VIDEO;
  if (mimeType.startsWith('image/')) return FileType.IMAGE;
  return FileType.DOCUMENT;
};