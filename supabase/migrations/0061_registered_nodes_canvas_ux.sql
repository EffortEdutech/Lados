-- ============================================================
-- Migration 0061: Phase 21 S7 — Canvas UX metadata on registered_nodes
-- ============================================================
-- Every official Capability Pack node declares a `canvasUx` block in its
-- nodes.json (minWidth, minHeight, maxVisiblePortsPerSide — the Phase 20B6
-- visual metadata contract), but OfficialPackLoaderService never persisted
-- it, so the field was silently discarded before it ever reached the
-- frontend. This is the gap behind the S7 checklist item "Canvas
-- readability standard applied (20B checklist): high-port nodes use
-- grouped/resource inputs, no duplicate handles, labels/titles fit,
-- inspector carries detail" — WorkflowCanvas.tsx's SkillNode has always
-- rendered every node at a fixed 260px width regardless of what its
-- manifest actually asked for.
--
-- Nullable, no default: existing prototype nodes simply have canvas_ux =
-- null (SkillNode already falls back to the historical 260px/full-port
-- rendering when canvasUx is absent — zero behavior change for them).

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS canvas_ux jsonb;

COMMENT ON COLUMN registered_nodes.canvas_ux IS
  'Phase 20B6 canvas visual metadata: { minWidth, minHeight, maxVisiblePortsPerSide }. Null for pre-Phase-20 prototype nodes and any official node whose manifest omits canvasUx.';
