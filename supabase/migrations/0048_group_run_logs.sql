-- Sprint 14B: selective canvas group execution logs.
-- Stores diagnostic "Run Group" executions separately from published workflow runs.

create table if not exists public.group_run_logs (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references public.workflows(id) on delete cascade,
  project_id      uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id        text not null,
  group_name      text,
  triggered_by    uuid references auth.users(id),
  run_at          timestamptz not null default now(),
  status          text not null default 'running'
                    check (status in ('running', 'completed', 'failed', 'paused', 'cancelled')),
  test_inputs     jsonb not null default '{}'::jsonb,
  node_results    jsonb not null default '{}'::jsonb,
  logs            jsonb not null default '[]'::jsonb,
  duration_ms     integer,
  error           jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_group_run_logs_workflow
  on public.group_run_logs(workflow_id, run_at desc);

create index if not exists idx_group_run_logs_org
  on public.group_run_logs(organization_id, run_at desc);

create index if not exists idx_group_run_logs_group
  on public.group_run_logs(workflow_id, group_id, run_at desc);

alter table public.group_run_logs enable row level security;

drop policy if exists "Members can read group run logs" on public.group_run_logs;
create policy "Members can read group run logs"
on public.group_run_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = group_run_logs.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "Members can insert own group run logs" on public.group_run_logs;
create policy "Members can insert own group run logs"
on public.group_run_logs
for insert
to authenticated
with check (
  triggered_by = auth.uid()
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id = group_run_logs.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "Members can update own group run logs" on public.group_run_logs;
create policy "Members can update own group run logs"
on public.group_run_logs
for update
to authenticated
using (
  triggered_by = auth.uid()
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id = group_run_logs.organization_id
      and om.user_id = auth.uid()
  )
)
with check (
  triggered_by = auth.uid()
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id = group_run_logs.organization_id
      and om.user_id = auth.uid()
  )
);
