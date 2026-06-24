-- =============================================================================
-- Contractor Edition Test Seed
-- Phase 9 — M1–M4  /  Phase 10 — AI Runtime
--
-- Creates a ready-to-test Contractor Edition environment:
--   • 4 auth users   (owner, admin, driver1, driver2)
--   • 1 contractor organisation (Syarikat Bina Jaya Sdn Bhd)
--   • 4 org members with correct roles
--   • contractor-pack activated (is_enabled = true)
--   • Sample resources: customers, vehicles, equipment, workers, site,
--                       job, 2 trips, 2 fuel receipts, 1 expense
--
-- Prerequisites:
--   Migrations 0001–0035 must be applied before running this seed.
--
-- IDEMPOTENT: safe to re-run. Section 0 deletes all test data first,
--   then re-inserts clean. No ON CONFLICT hacks needed for auth tables.
--
-- Run in Supabase SQL Editor (postgres / service_role context).
-- =============================================================================

-- ── Fixed UUIDs (deterministic across every run) ──────────────────────────────
-- Users
-- contractor-owner@lados.dev   → dddddddd-0001-0000-0000-000000000001
-- contractor-admin@lados.dev   → dddddddd-0001-0000-0000-000000000002
-- contractor-driver1@lados.dev → dddddddd-0001-0000-0000-000000000003
-- contractor-driver2@lados.dev → dddddddd-0001-0000-0000-000000000004
--
-- Org: Syarikat Bina Jaya      → eeeeeeee-0001-0000-0000-000000000001
-- Resources:                     aaaaaaaa-0002-0000-0000-000000000001 … 000000000014

DO $$
DECLARE
  v_owner_id   uuid := 'dddddddd-0001-0000-0000-000000000001';
  v_admin_id   uuid := 'dddddddd-0001-0000-0000-000000000002';
  v_driver1_id uuid := 'dddddddd-0001-0000-0000-000000000003';
  v_driver2_id uuid := 'dddddddd-0001-0000-0000-000000000004';
  v_org_id     uuid := 'eeeeeeee-0001-0000-0000-000000000001';

  -- Resource UUIDs (M1–M4)
  v_customer1_id    uuid := 'aaaaaaaa-0002-0000-0000-000000000001';
  v_customer2_id    uuid := 'aaaaaaaa-0002-0000-0000-000000000002';
  v_vehicle1_id     uuid := 'aaaaaaaa-0002-0000-0000-000000000003';
  v_vehicle2_id     uuid := 'aaaaaaaa-0002-0000-0000-000000000004';
  v_equipment_id    uuid := 'aaaaaaaa-0002-0000-0000-000000000005';
  v_driver1_res_id  uuid := 'aaaaaaaa-0002-0000-0000-000000000006';
  v_driver2_res_id  uuid := 'aaaaaaaa-0002-0000-0000-000000000007';
  v_site_id         uuid := 'aaaaaaaa-0002-0000-0000-000000000008';
  v_job_id          uuid := 'aaaaaaaa-0002-0000-0000-000000000009';
  v_trip_id         uuid := 'aaaaaaaa-0002-0000-0000-000000000010';
  -- Phase 10 additions
  v_trip2_id         uuid := 'aaaaaaaa-0002-0000-0000-000000000011';
  v_fuel_receipt1_id uuid := 'aaaaaaaa-0002-0000-0000-000000000012';
  v_fuel_receipt2_id uuid := 'aaaaaaaa-0002-0000-0000-000000000013';
  v_expense1_id      uuid := 'aaaaaaaa-0002-0000-0000-000000000014';

BEGIN

-- =============================================================================
-- 0. CLEANUP — delete existing test data in dependency order
--
--    Why: ON CONFLICT DO NOTHING on auth.users catches conflicts on whichever
--    unique constraint fires first (id OR email). If a previous run created
--    users with our fixed UUIDs, a re-run would skip the inserts — but then
--    auth.identities inserts would still try to reference those UUIDs, which
--    might no longer exist (e.g. if the user table was partially reset).
--    Deleting first guarantees a clean slate regardless of prior state.
-- =============================================================================

  -- Resources (lados_resource_events cascades automatically via ON DELETE CASCADE FK)
  DELETE FROM lados_resources
  WHERE org_id = v_org_id;

  -- Org members
  DELETE FROM organization_members
  WHERE organization_id = v_org_id;

  -- Organisation
  DELETE FROM organizations
  WHERE id = v_org_id;

  -- Auth users by email — catches any UUID the user was created with.
  -- Cascades to auth.identities automatically.
  DELETE FROM auth.users
  WHERE email IN (
    'contractor-owner@lados.dev',
    'contractor-admin@lados.dev',
    'contractor-driver1@lados.dev',
    'contractor-driver2@lados.dev'
  );

  RAISE NOTICE 'Section 0: cleanup complete — inserting fresh data...';

-- =============================================================================
-- 1. AUTH USERS
--    Creates users directly in auth.users (requires postgres / service_role).
--    Password for all test accounts: ContractorTest1!
--    Accounts are pre-confirmed (email_confirmed_at = now()).
--
--    No ON CONFLICT needed — we deleted these rows in Section 0.
-- =============================================================================

  -- email_change and email_change_token_new MUST be '' not NULL.
  -- Supabase GoTrue panics (500 on login) when these are NULL.
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change, email_change_token_new,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_super_admin
  )
  VALUES
    -- Owner
    (
      v_owner_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'contractor-owner@lados.dev',
      crypt('ContractorTest1!', gen_salt('bf')),
      now(), '', '',
      '', '',
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Ahmad Rizal (Owner)"}',
      now(), now(), false
    ),
    -- Admin
    (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'contractor-admin@lados.dev',
      crypt('ContractorTest1!', gen_salt('bf')),
      now(), '', '',
      '', '',
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Siti Nora (Admin)"}',
      now(), now(), false
    ),
    -- Driver 1
    (
      v_driver1_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'contractor-driver1@lados.dev',
      crypt('ContractorTest1!', gen_salt('bf')),
      now(), '', '',
      '', '',
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Razi Hamdan (Driver)"}',
      now(), now(), false
    ),
    -- Driver 2
    (
      v_driver2_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'contractor-driver2@lados.dev',
      crypt('ContractorTest1!', gen_salt('bf')),
      now(), '', '',
      '', '',
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Farid Azman (Driver)"}',
      now(), now(), false
    );
  -- ↑ No ON CONFLICT — users were deleted in Section 0. Plain INSERT is safe.

  -- auth.identities — required for email/password login in Supabase
  -- (Section 0 deleted these via auth.users cascade, so plain INSERT is safe)
  -- IMPORTANT: identity `id` must be distinct from `user_id` (Supabase GoTrue requirement).
  --            Using gen_random_uuid() here; using user_id for both caused 500 on login.
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
  )
  VALUES
    (
      gen_random_uuid(), v_owner_id,
      'contractor-owner@lados.dev', 'email',
      jsonb_build_object('sub', v_owner_id::text, 'email', 'contractor-owner@lados.dev', 'email_verified', true),
      now(), now(), now()
    ),
    (
      gen_random_uuid(), v_admin_id,
      'contractor-admin@lados.dev', 'email',
      jsonb_build_object('sub', v_admin_id::text, 'email', 'contractor-admin@lados.dev', 'email_verified', true),
      now(), now(), now()
    ),
    (
      gen_random_uuid(), v_driver1_id,
      'contractor-driver1@lados.dev', 'email',
      jsonb_build_object('sub', v_driver1_id::text, 'email', 'contractor-driver1@lados.dev', 'email_verified', true),
      now(), now(), now()
    ),
    (
      gen_random_uuid(), v_driver2_id,
      'contractor-driver2@lados.dev', 'email',
      jsonb_build_object('sub', v_driver2_id::text, 'email', 'contractor-driver2@lados.dev', 'email_verified', true),
      now(), now(), now()
    );

-- =============================================================================
-- 2. ORGANISATION
-- =============================================================================

  INSERT INTO organizations (id, name, slug, logo_url)
  VALUES (
    v_org_id,
    'Syarikat Bina Jaya Sdn Bhd',
    'bina-jaya',
    NULL
  );

-- =============================================================================
-- 3. ORG MEMBERS
-- =============================================================================

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES
    (v_org_id, v_owner_id,   'owner'),
    (v_org_id, v_admin_id,   'admin'),
    (v_org_id, v_driver1_id, 'driver'),
    (v_org_id, v_driver2_id, 'driver');

-- =============================================================================
-- 4. ACTIVATE CONTRACTOR-PACK
--    PackInstallerService.syncAll() runs on API startup and upserts these rows.
--    This UPDATE ensures they are enabled even before the first API restart.
-- =============================================================================

  UPDATE packs
  SET is_enabled = true, status = 'active'
  WHERE id = 'lados.contractor-pack';

  -- foundation-pack must also be active (contractor-pack depends on it)
  UPDATE packs
  SET is_enabled = true, status = 'active'
  WHERE id = 'lados.foundation-pack';

-- =============================================================================
-- 5. SEED RESOURCES — M1 Core Operations
--    customers → vehicles / equipment / drivers → site → job → trip
-- =============================================================================

  -- ── Customers ──────────────────────────────────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, created_by)
  VALUES
    (
      v_customer1_id, v_org_id,
      'customer', 'Pembinaan Maju Jaya Sdn Bhd', 'active',
      '{"contactPerson":"En. Kamal","phone":"012-3456789","email":"kamal@pmj.com.my","address":"Lot 5, Jalan Industri 3, Shah Alam","creditLimit":50000}',
      v_owner_id
    ),
    (
      v_customer2_id, v_org_id,
      'customer', 'Projek Bersatu Holdings', 'active',
      '{"contactPerson":"Pn. Lina","phone":"013-9876543","email":"lina@pb-holdings.com","address":"Unit 12, Menara Projek, KL","creditLimit":80000}',
      v_owner_id
    );

  -- ── Vehicles ───────────────────────────────────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, created_by)
  VALUES
    (
      v_vehicle1_id, v_org_id,
      'vehicle', 'Lorry BJA-1234', 'available',
      '{"plateNumber":"BJA 1234","vehicleType":"lorry","make":"Hino","model":"500 Series","year":2020,"capacity":"10 tan","lastServiceDate":"2025-12-01"}',
      v_owner_id
    ),
    (
      v_vehicle2_id, v_org_id,
      'vehicle', 'Dump Truck BJA-5678', 'available',
      '{"plateNumber":"BJA 5678","vehicleType":"dump_truck","make":"Mitsubishi","model":"Fighter","year":2019,"capacity":"14 tan","lastServiceDate":"2025-11-15"}',
      v_owner_id
    );

  -- ── Equipment ──────────────────────────────────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, created_by)
  VALUES (
    v_equipment_id, v_org_id,
    'equipment', 'Excavator CAT-320', 'available',
    '{"serialNumber":"CAT320-2021-007","make":"Caterpillar","model":"320","year":2021,"hourlyRate":350,"lastServiceHours":1200}',
    v_owner_id
  );

  -- ── Drivers ────────────────────────────────────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, created_by)
  VALUES
    (
      v_driver1_res_id, v_org_id,
      'driver', 'Razi Hamdan', 'available',
      '{"phone":"011-1234567","licenseNumber":"D12345678","licenseClass":"E","dailyRate":120,"linkedUserId":"dddddddd-0001-0000-0000-000000000003"}',
      v_owner_id
    ),
    (
      v_driver2_res_id, v_org_id,
      'driver', 'Farid Azman', 'available',
      '{"phone":"011-9876543","licenseNumber":"D87654321","licenseClass":"E","dailyRate":120,"linkedUserId":"dddddddd-0001-0000-0000-000000000004"}',
      v_owner_id
    );

  -- ── Site ───────────────────────────────────────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, created_by)
  VALUES (
    v_site_id, v_org_id,
    'site', 'Tapak Projek Sri Permai', 'active',
    '{"address":"Lot 22, Persiaran Industri, Rawang, Selangor","gpsLat":3.3195,"gpsLng":101.5753,"siteContact":"En. Rashid 013-1112233"}',
    v_owner_id
  );

  -- ── Job ────────────────────────────────────────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, created_by)
  VALUES (
    v_job_id, v_org_id,
    'job', 'JOB-2026-001 — Earthworks Sri Permai', 'active',
    jsonb_build_object(
      'customerId',   v_customer1_id,
      'siteId',       v_site_id,
      'description',  'Earthworks and soil compaction for residential development Phase 1',
      'startDate',    '2026-06-23',
      'endDate',      '2026-08-31',
      'quotedAmount', 45000,
      'currency',     'MYR',
      'poNumber',     'PMJ-PO-2026-044'
    ),
    v_owner_id
  );

  -- ── Trip 1 — pending ───────────────────────────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, parent_id, created_by)
  VALUES (
    v_trip_id, v_org_id,
    'trip', 'TRIP-2026-001-001', 'pending',
    jsonb_build_object(
      'jobId',        v_job_id,
      'vehicleId',    v_vehicle1_id,
      'driverId',     v_driver1_res_id,
      'loadType',     'earth',
      'loadQuantity', 10,
      'loadUnit',     'tan',
      'origin',       'Tapak Sri Permai',
      'destination',  'Pusat Pelupusan Rawang'
    ),
    v_job_id,
    v_driver1_id
  );

-- =============================================================================
-- 6. SEED RESOURCES — Phase 10 AI Test Data
--    - Trip 2 (completed)         — gives AI assistant a completed trip to query
--    - Fuel Receipt 1 (with image) — tests extract_fuel_data via GPT-4o-mini vision
--    - Fuel Receipt 2 (no image)   — tests graceful error path (no fileUrl)
--    - Expense (pending_approval)  — tests M2 approve_expense flow
-- =============================================================================

  -- ── Trip 2 — completed ────────────────────────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, parent_id, created_by)
  VALUES (
    v_trip2_id, v_org_id,
    'trip', 'TRIP-2026-001-002', 'completed',
    jsonb_build_object(
      'jobId',        v_job_id,
      'vehicleId',    v_vehicle2_id,
      'driverId',     v_driver2_res_id,
      'loadType',     'earth',
      'loadQuantity', 12,
      'loadUnit',     'tan',
      'origin',       'Tapak Sri Permai',
      'destination',  'Pusat Pelupusan Rawang',
      'completedAt',  '2026-06-21T15:30:00+08:00'
    ),
    v_job_id,
    v_driver2_id
  );

  -- ── Fuel Receipt 1 — with public image URL (pending_review) ──────────────
  --    fileUrl is a publicly accessible image — the extract_fuel_data node
  --    will send this URL to GPT-4o-mini vision. Replace with a real petrol
  --    receipt image URL for a more meaningful extraction test.
  INSERT INTO lados_resources (id, org_id, type, name, state, data, parent_id, created_by)
  VALUES (
    v_fuel_receipt1_id, v_org_id,
    'fuel_receipt', 'FUEL-2026-001 — Petronas Rawang', 'pending_review',
    jsonb_build_object(
      'tripId',      v_trip_id,
      'vehicleId',   v_vehicle1_id,
      'driverId',    v_driver1_res_id,
      'fileUrl',     'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
      'uploadedAt',  '2026-06-22T08:15:00+08:00',
      'notes',       'Fuel receipt from Petronas Rawang. Awaiting AI extraction. (fileUrl is an embedded test JPEG — no external URL needed. In production this is a Supabase Storage URL from user upload.)',
      'aiExtracted', null
    ),
    v_job_id,
    v_driver1_id
  );

  -- ── Fuel Receipt 2 — no image (pending_review, tests error path) ─────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, parent_id, created_by)
  VALUES (
    v_fuel_receipt2_id, v_org_id,
    'fuel_receipt', 'FUEL-2026-002 — Shell Rawang (no image)', 'pending_review',
    jsonb_build_object(
      'tripId',      v_trip2_id,
      'vehicleId',   v_vehicle2_id,
      'driverId',    v_driver2_res_id,
      'uploadedAt',  '2026-06-21T16:00:00+08:00',
      'notes',       'fileUrl intentionally missing — tests error handling in extract_fuel_data.',
      'aiExtracted', null
    ),
    v_job_id,
    v_driver2_id
  );

  -- ── Expense 1 — toll (pending_approval) ──────────────────────────────────
  INSERT INTO lados_resources (id, org_id, type, name, state, data, parent_id, created_by)
  VALUES (
    v_expense1_id, v_org_id,
    'expense', 'EXP-2026-001 — Toll & Miscellaneous', 'pending_approval',
    jsonb_build_object(
      'tripId',      v_trip_id,
      'category',    'toll',
      'amount',      45.60,
      'currency',    'MYR',
      'description', 'PLUS highway toll (2 way) + parking at disposal site',
      'receiptUrl',  null,
      'submittedBy', v_driver1_res_id,
      'submittedAt', '2026-06-22T09:00:00+08:00'
    ),
    v_job_id,
    v_driver1_id
  );

-- =============================================================================
-- 7. AUDIT LOG
-- =============================================================================

  INSERT INTO audit_log (
    organization_id, actor_id, event_type,
    entity_type, entity_id, summary
  )
  VALUES (
    v_org_id, v_owner_id,
    'seed.contractor_edition',
    'organization', v_org_id,
    'Contractor Edition seed applied — Syarikat Bina Jaya, 4 users, contractor-pack v0.4.0, Phase 10 AI test data.'
  );

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Contractor Edition seed complete.';
  RAISE NOTICE '  Org:   Syarikat Bina Jaya Sdn Bhd (%)', v_org_id;
  RAISE NOTICE '  Login: contractor-owner@lados.dev   /  ContractorTest1!';
  RAISE NOTICE '         contractor-admin@lados.dev   /  ContractorTest1!';
  RAISE NOTICE '         contractor-driver1@lados.dev /  ContractorTest1!';
  RAISE NOTICE '         contractor-driver2@lados.dev /  ContractorTest1!';
  RAISE NOTICE '  Pack:  lados.contractor-pack → activated (v0.4.0)';
  RAISE NOTICE '  Resources:';
  RAISE NOTICE '    2 customers, 2 vehicles, 1 excavator, 2 drivers, 1 site';
  RAISE NOTICE '    1 job (active), 2 trips (1 pending / 1 completed)';
  RAISE NOTICE '    2 fuel receipts (pending_review), 1 expense (pending_approval)';
  RAISE NOTICE 'Phase 10 AI test paths:';
  RAISE NOTICE '  FUEL-2026-001 has fileUrl → test extract_fuel_data (GPT-4o-mini vision)';
  RAISE NOTICE '  FUEL-2026-002 no fileUrl  → test extract_fuel_data error path';
  RAISE NOTICE '  EXP-2026-001 pending_approval → test approve_expense (M2)';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'After running: restart the API → PackInstaller.syncAll()';
  RAISE NOTICE 'Then open /packs and click Sync to confirm v0.4.0 is active.';

END $$;
