-- ============================================================
-- Migration 0055: RLS initplan rewrite (PD-3)
-- ============================================================
-- Advisor: auth_rls_initplan (74 WARN policies as of 2026-07-02).
--
-- Problem: policies calling auth.uid() directly re-evaluate the
-- function FOR EVERY ROW scanned. Wrapping it as (SELECT auth.uid())
-- lets the planner evaluate it once per statement (InitPlan).
--
-- Approach: rewrite dynamically from pg_policies rather than
-- hand-maintaining 74 ALTER POLICY statements. The filter skips
-- policies that are already wrapped, so this migration is
-- idempotent and safe to re-run.
--
-- Verification after apply:
--   Supabase advisors (performance) → auth_rls_initplan should be 0.
-- ============================================================

DO $$
DECLARE
  p record;
  rewritten int := 0;
BEGIN
  FOR p IN
    SELECT tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual       LIKE '%auth.uid()%' AND qual       NOT LIKE '%SELECT auth.uid()%') OR
        (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%')
      )
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I%s%s',
      p.policyname,
      p.tablename,
      CASE WHEN p.qual IS NOT NULL
        THEN ' USING (' || replace(p.qual, 'auth.uid()', '(SELECT auth.uid())') || ')'
        ELSE '' END,
      CASE WHEN p.with_check IS NOT NULL
        THEN ' WITH CHECK (' || replace(p.with_check, 'auth.uid()', '(SELECT auth.uid())') || ')'
        ELSE '' END
    );
    rewritten := rewritten + 1;
  END LOOP;

  RAISE NOTICE 'RLS initplan rewrite complete: % policies updated', rewritten;
END $$;
