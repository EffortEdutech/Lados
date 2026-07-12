'use client';

/**
 * Program detail/canvas page — Phase 23 S23.4, renamed from Pipeline detail
 * page in Phase 24 S24.4
 *
 * `programs` is an org-level (not project-nested) resource, so this route
 * needs an orgId alongside the programId path param. Passed as a query
 * string from the /programs list page's Link; if a user lands here
 * directly without it (bookmarked URL, etc.), falls back to fetching the
 * user's orgs and using the first one — same graceful-fallback spirit as
 * the Departments page's own org auto-select.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient, apiErrorMessage } from '@/lib/api/client';
import ProgramCanvas from '@/components/programs/ProgramCanvas';

interface Organization {
  id: string;
  name?: string;
}

export default function ProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryOrgId = searchParams.get('orgId');
  const [orgId, setOrgId] = useState<string | null>(queryOrgId);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(!queryOrgId);

  useEffect(() => {
    if (queryOrgId) return;
    let cancelled = false;
    (async () => {
      const res = await apiClient.get<Organization[]>('/organizations');
      if (cancelled) return;
      if (res.error || !res.data?.length) {
        setError(apiErrorMessage(res.error, 'No organization found for this program'));
      } else {
        setOrgId(res.data[0].id);
      }
      setResolving(false);
    })();
    return () => { cancelled = true; };
  }, [queryOrgId]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] px-6 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/programs" className="text-sm text-gray-400 hover:text-gray-700">
          ← Programs
        </Link>
      </div>

      {resolving && (
        <p className="text-sm text-gray-400 text-center py-16">Loading…</p>
      )}

      {!resolving && error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => router.push('/programs')}
            className="ml-3 underline underline-offset-2"
          >
            Back to Programs
          </button>
        </div>
      )}

      {!resolving && !error && orgId && (
        <ProgramCanvas orgId={orgId} programId={programId} />
      )}
    </div>
  );
}
