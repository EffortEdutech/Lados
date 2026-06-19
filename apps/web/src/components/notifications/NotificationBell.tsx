'use client';

/**
 * NotificationBell — Sprint 14 (S14-004)
 *
 * Bell icon in the app top bar. Shows unread count badge.
 * Click to open dropdown with recent notifications.
 * Polls every 30 s for new notifications (Realtime in Sprint 19).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  approval_request:   '✋',
  execution_complete: '✅',
  execution_failed:   '❌',
  data_pack_update:   '📦',
  quota_warning:      '⚠️',
  system:             '🔔',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    apiClient
      .get<Notification[]>('/notifications')
      .then((res) => setNotifications(res.data ?? []))
      .catch(() => {/* silent — bell shouldn't break the UI */})
      .finally(() => setLoading(false));
  }, []);

  // Initial fetch + 30s poll
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => { void fetchNotifications(); }, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleMarkAllRead() {
    await apiClient.patch('/notifications/read-all', {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleMarkRead(id: string) {
    await apiClient.patch(`/notifications/${id}/read`, {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className="text-lg leading-none">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-blue-500 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">No notifications yet</p>
            )}
            {notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                  n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                }`}
                onClick={() => {
                  void handleMarkRead(n.id);
                  if (n.action_url) window.location.href = n.action_url;
                }}
              >
                <span className="flex-shrink-0 text-base mt-0.5">
                  {TYPE_ICONS[n.type] ?? '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">{n.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <span className="text-[10px] text-gray-300">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''} · refreshes every 30s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
