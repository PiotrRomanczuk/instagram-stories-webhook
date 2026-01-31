import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a timestamp as a relative time string (e.g., "5m ago", "2h ago", "3d ago")
 * Falls back to locale date string for dates older than 7 days
 */
export function formatRelativeTime(date: Date | string | number | null): string {
  if (!date) return 'No date';

  const now = new Date();
  const timestamp = new Date(date);
  const diff = now.getTime() - timestamp.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return timestamp.toLocaleDateString();
}
