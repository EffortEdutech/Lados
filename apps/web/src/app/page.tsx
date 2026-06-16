import { redirect } from 'next/navigation';

/**
 * Root page — redirects to dashboard.
 * If unauthenticated, the dashboard page will redirect to login.
 */
export default function RootPage() {
  redirect('/dashboard');
}
