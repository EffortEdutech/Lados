'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/notifications/NotificationBell';
import AiCommandBar from '@/components/AiCommandBar';
import OwnerAssistantSidebar from '@/components/OwnerAssistantSidebar';

// Sidebar grouping (2026-07-11) — the nav was a single flat 12-item list
// with work items, business-domain data, insights, platform/marketplace,
// and settings all interleaved with no visual hierarchy. Grouped by what
// eff actually reaches for together: daily work (Projects/Programs
// orchestrate work, Approvals is the action queue for both), business data
// that work operates on, cross-cutting insights, the pack/marketplace
// platform layer, and org settings — settings-style groups conventionally
// sit last. `href`/`icon` values are unchanged from the old flat list, so
// no route or icon-lookup logic needed updating, only the render loop.
const NAV_GROUPS: { label: string | null; items: { href: string; label: string; icon: string }[] }[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/projects',  label: 'Projects',  icon: 'folder' },
      { href: '/programs',  label: 'Programs',  icon: 'git-branch' },
      { href: '/approvals', label: 'Approvals', icon: 'check-square' },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/resources', label: 'Assets',    icon: 'layers' },
      { href: '/suppliers', label: 'Suppliers', icon: 'truck' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/ai',        label: 'AI Insights', icon: 'cpu' },
      { href: '/analytics', label: 'Operations',  icon: 'bar-chart' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/packs',       label: 'Packs',       icon: 'package' },
      { href: '/marketplace', label: 'Marketplace', icon: 'shopping-cart' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/settings/departments', label: 'Departments', icon: 'building' },
      { href: '/settings/services',    label: 'Services',    icon: 'settings' },
    ],
  },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  grid: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  folder: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  layers: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  'check-square': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  cpu: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  ),
  truck: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  package: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  'shopping-cart': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
  settings: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  building: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1"/>
      <line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/>
      <line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/>
      <line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/>
      <line x1="9" y1="18" x2="15" y2="18"/>
    </svg>
  ),
  'bar-chart': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
    </svg>
  ),
  'git-branch': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <path d="M18 9a9 9 0 0 1-9 9"/>
    </svg>
  ),
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Item 6 (eff, 2026-07-05): show the logged-in user's name/email near
  // Notifications/Sign out — previously the sidebar had no indication of
  // who was logged in at all.
  const [userLabel, setUserLabel] = useState<string | null>(null);

  // Mobile nav (2026-07-13): the sidebar was a permanently-visible flex
  // child, which is fine on desktop but on a phone-width viewport it either
  // squeezed <main> to nothing or forced horizontal scroll. Below the `md`
  // breakpoint the sidebar is now an off-canvas overlay (fixed + translated
  // out of view) toggled by a hamburger button in a small top bar; at `md`
  // and up it reverts to the original static/always-visible layout.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user) return;
      const displayName =
        (user.user_metadata?.['full_name'] as string | undefined) ??
        (user.user_metadata?.['name'] as string | undefined) ??
        null;
      setUserLabel(displayName ?? user.email ?? null);
    });
  }, []);

  // Close the mobile nav automatically whenever the route changes (e.g.
  // after tapping a nav link), rather than requiring a second tap to close.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Bugfix 2026-07-07: router.push() + router.refresh() back-to-back fired
    // two overlapping RSC re-renders of the route tree (push already gets a
    // fresh server render of the destination route) — React's dev-mode
    // <html>/<body> singleton check caught the race and logged "mounting a
    // new html/body component when a previous one has not first unmounted."
    // push() alone is correct here since we're navigating away, not
    // re-rendering the current route.
    router.push('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile top bar — hamburger + logo + notifications, hidden at md+ */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-2 bg-gray-900 text-white px-4 py-3 border-b border-gray-700">
        <button
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-800"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileNavOpen ? (
              <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            ) : (
              <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
            )}
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded">
            <img src="/lados-icon-transparent.png" alt="Lados" className="h-full w-full object-contain" />
          </div>
          <p className="text-sm font-semibold leading-none">Lados</p>
        </div>
        <NotificationBell variant="topbar" />
      </div>

      {/* Mobile backdrop — tap to close the off-canvas nav */}
      {mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — off-canvas overlay below md, static/always-visible at md+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 flex flex-col bg-gray-900 text-white overflow-visible
          transform transition-transform duration-200 ease-in-out
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:z-auto md:w-56 md:translate-x-0 md:transform-none`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-700">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <img
              src="/lados-icon-transparent.png"
              alt="Lados"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Lados</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Workflow Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={group.label ?? `group-${groupIdx}`} className={groupIdx > 0 ? 'mt-4' : ''}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-current opacity-70">
                        {NAV_ICONS[item.icon] ?? null}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Notifications + Sign out */}
        <div className="px-3 py-4 border-t border-gray-700 space-y-1">
          {userLabel && (
            <div className="px-3 py-1.5 mb-1">
              <p className="text-xs font-medium text-gray-200 truncate" title={userLabel}>
                {userLabel}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs text-gray-500">Notifications</span>
            <NotificationBell />
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-70">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — top padding clears the fixed mobile top bar below md */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0 w-full min-w-0">
        {children}
      </main>

      {/* Global AI command bar - floating button, accessible from all pages */}
      <AiCommandBar />

      {/* Owner Assistant sidebar - slide-in panel, Cmd+Shift+A shortcut (Phase 2D) */}
      <OwnerAssistantSidebar />
    </div>
  );
}
