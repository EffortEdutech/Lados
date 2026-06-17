-- =============================================================================
-- Pipeline Test Workflow Templates
-- Seeds 4 workflow templates that together form a full procurement pipeline:
--
--   [BOQ Preparation] → [BOQ to RFQ*] → Switch(Trade)
--                                            ├── [Quotation Comparison — Civil]
--                                            └── [Quotation Comparison — M&E]
--                                                       ↓ (both)
--                                         [Supplier Recommendation]
--
-- * BOQ to RFQ already seeded in 0010_sprint10_templates_approvals.sql
--
-- Nodes marked (mock) have no real implementation yet — the runner executes
-- them as mocks, returning plausible output. They will be made real in
-- future sprints.
-- =============================================================================

INSERT INTO public.workflow_templates
  (slug, name, description, category, tags, icon, color, preview_nodes, sort_order, definition)
VALUES

-- ---------------------------------------------------------------------------
-- 1. BOQ PREPARATION & VALIDATION
--    Comes BEFORE BOQ→RFQ. Cleans the raw BOQ, runs a completeness check,
--    QS signs off, then saves the validated BOQ as a project artifact so
--    the BOQ→RFQ workflow can read it.
-- ---------------------------------------------------------------------------
(
  'boq-preparation',
  'BOQ Preparation & Validation',
  'Clean and validate a raw Bill of Quantities before issuing for tender. Checks for missing quantities, zero rates, and incomplete descriptions. QS signs off before the BOQ is released for RFQ generation.',
  'procurement',
  ARRAY['BOQ', 'Validation', 'QS', 'Pre-Tender'],
  'clipboard-check',
  '#0F4C81',
  ARRAY['Manual Trigger', 'Read BOQ', 'Clean BOQ', 'Validate BOQ', 'Save Artifact', 'QS Sign-off', 'Logger'],
  5,
  '{
    "version": "1.0.0",
    "nodes": [
      {
        "id": "node-trigger",
        "type": "core.manual_trigger",
        "label": "Start",
        "position": {"x": 60, "y": 200},
        "config": {},
        "inputs": [],
        "outputs": ["trigger_data"]
      },
      {
        "id": "node-read-boq",
        "type": "qs.read_boq",
        "label": "Read BOQ File",
        "position": {"x": 280, "y": 200},
        "config": {
          "currency": "MYR"
        },
        "inputs": ["file_url", "library_file_id"],
        "outputs": ["boq", "currency", "sections", "total_items"]
      },
      {
        "id": "node-clean-boq",
        "type": "qs.clean_boq",
        "label": "Clean & Normalise",
        "position": {"x": 500, "y": 200},
        "config": {
          "remove_zero_qty": true,
          "trim_descriptions": true
        },
        "inputs": ["boq"],
        "outputs": ["boq", "clean_items", "removed_count"]
      },
      {
        "id": "node-validate",
        "type": "qs.validate_boq",
        "label": "Validate BOQ",
        "position": {"x": 720, "y": 200},
        "config": {
          "check_missing_rates": true,
          "check_missing_descriptions": true,
          "min_items": 1
        },
        "inputs": ["boq", "clean_items"],
        "outputs": ["valid", "issues", "issue_count", "boq"]
      },
      {
        "id": "node-save-artifact",
        "type": "project.save_artifact",
        "label": "Save Validated BOQ",
        "position": {"x": 940, "y": 200},
        "config": {
          "artifact_key": "validated_boq"
        },
        "inputs": ["boq", "clean_items", "valid"],
        "outputs": ["saved", "artifact_key", "saved_at"]
      },
      {
        "id": "node-approval",
        "type": "core.human_approval",
        "label": "QS Sign-off",
        "position": {"x": 1160, "y": 200},
        "config": {
          "title": "Review Validated BOQ Before Proceeding to RFQ",
          "assignee_role": "owner"
        },
        "inputs": ["valid", "issues"],
        "outputs": ["approved", "comments"]
      },
      {
        "id": "node-logger",
        "type": "core.logger",
        "label": "Log BOQ Approved",
        "position": {"x": 1380, "y": 200},
        "config": {
          "message": "BOQ Preparation complete. Validated BOQ artifact saved. Ready for RFQ generation.",
          "level": "info"
        },
        "inputs": ["approved"],
        "outputs": ["logged"]
      }
    ],
    "edges": [
      {"id": "e1", "source": "node-trigger",       "target": "node-read-boq"},
      {"id": "e2", "source": "node-read-boq",      "target": "node-clean-boq"},
      {"id": "e3", "source": "node-clean-boq",     "target": "node-validate"},
      {"id": "e4", "source": "node-validate",      "target": "node-save-artifact"},
      {"id": "e5", "source": "node-save-artifact", "target": "node-approval"},
      {"id": "e6", "source": "node-approval",      "target": "node-logger"}
    ],
    "variables": {},
    "metadata": {
      "name": "BOQ Preparation & Validation",
      "description": "Validate and sign off a BOQ before RFQ generation.",
      "version": "1.0.0",
      "author": "QS-OS"
    }
  }'::jsonb
),

-- ---------------------------------------------------------------------------
-- 2. QUOTATION COMPARISON — CIVIL & STRUCTURAL WORKS
--    Branch A after BOQ→RFQ. Reads the rfq_package artifact, collects
--    contractor quotations for civil/structural trade, normalises them,
--    scores and compares, QS reviews, saves result artifact.
-- ---------------------------------------------------------------------------
(
  'quotation-comparison-civil',
  'Quotation Comparison — Civil & Structural',
  'Collect, normalise, and compare contractor quotations received for Civil and Structural works. Scores each quote on price, compliance, and completeness. QS reviews the comparison before a recommendation is made.',
  'procurement',
  ARRAY['Quotation', 'Civil', 'Structural', 'Comparison', 'Tender'],
  'bar-chart-2',
  '#1A6B3A',
  ARRAY['Manual Trigger', 'Read RFQ Artifact', 'Collect Quotations', 'Normalise Quotes', 'Compare & Score', 'Save Artifact', 'QS Review', 'Logger'],
  20,
  '{
    "version": "1.0.0",
    "nodes": [
      {
        "id": "node-trigger",
        "type": "core.manual_trigger",
        "label": "Start",
        "position": {"x": 60, "y": 200},
        "config": {},
        "inputs": [],
        "outputs": ["trigger_data"]
      },
      {
        "id": "node-read-rfq",
        "type": "project.read_artifact",
        "label": "Load RFQ Package",
        "position": {"x": 280, "y": 200},
        "config": {
          "artifact_key": "rfq_package"
        },
        "inputs": [],
        "outputs": ["documents", "document_count", "_artifact_key"]
      },
      {
        "id": "node-collect",
        "type": "procurement.collect_quotation",
        "label": "Collect Contractor Quotes",
        "position": {"x": 500, "y": 200},
        "config": {
          "trade": "Civil & Structural",
          "min_quotes": 3,
          "deadline_days": 14
        },
        "inputs": ["documents"],
        "outputs": ["quotations", "quote_count", "trade"]
      },
      {
        "id": "node-normalise",
        "type": "procurement.normalize_quotation",
        "label": "Normalise Quotes",
        "position": {"x": 720, "y": 200},
        "config": {
          "currency": "MYR",
          "exclude_gst": false
        },
        "inputs": ["quotations"],
        "outputs": ["normalised_quotes", "currency"]
      },
      {
        "id": "node-compare",
        "type": "procurement.compare_quotations",
        "label": "Compare & Score",
        "position": {"x": 940, "y": 200},
        "config": {
          "weight_price": 0.6,
          "weight_compliance": 0.3,
          "weight_experience": 0.1
        },
        "inputs": ["normalised_quotes"],
        "outputs": ["comparison_table", "ranked_quotes", "recommended_contractor"]
      },
      {
        "id": "node-save-artifact",
        "type": "project.save_artifact",
        "label": "Save Civil Comparison",
        "position": {"x": 1160, "y": 200},
        "config": {
          "artifact_key": "civil_quotation"
        },
        "inputs": ["comparison_table", "ranked_quotes", "recommended_contractor"],
        "outputs": ["saved", "artifact_key", "saved_at"]
      },
      {
        "id": "node-approval",
        "type": "core.human_approval",
        "label": "QS Review Comparison",
        "position": {"x": 1380, "y": 200},
        "config": {
          "title": "Review Civil Works Quotation Comparison",
          "assignee_role": "owner"
        },
        "inputs": ["comparison_table"],
        "outputs": ["approved", "comments"]
      },
      {
        "id": "node-logger",
        "type": "core.logger",
        "label": "Log Civil Review Done",
        "position": {"x": 1600, "y": 200},
        "config": {
          "message": "Civil & Structural quotation comparison reviewed and approved.",
          "level": "info"
        },
        "inputs": ["approved"],
        "outputs": ["logged"]
      }
    ],
    "edges": [
      {"id": "e1", "source": "node-trigger",        "target": "node-read-rfq"},
      {"id": "e2", "source": "node-read-rfq",       "target": "node-collect"},
      {"id": "e3", "source": "node-collect",        "target": "node-normalise"},
      {"id": "e4", "source": "node-normalise",      "target": "node-compare"},
      {"id": "e5", "source": "node-compare",        "target": "node-save-artifact"},
      {"id": "e6", "source": "node-save-artifact",  "target": "node-approval"},
      {"id": "e7", "source": "node-approval",       "target": "node-logger"}
    ],
    "variables": {},
    "metadata": {
      "name": "Quotation Comparison — Civil & Structural",
      "description": "Collect, normalise and compare quotations for Civil and Structural trade.",
      "version": "1.0.0",
      "author": "QS-OS"
    }
  }'::jsonb
),

-- ---------------------------------------------------------------------------
-- 3. QUOTATION COMPARISON — M&E WORKS
--    Branch B after BOQ→RFQ. Same pattern as Civil but scoped to
--    Mechanical & Electrical trade. Saves result as mne_quotation artifact.
-- ---------------------------------------------------------------------------
(
  'quotation-comparison-mne',
  'Quotation Comparison — M&E Works',
  'Collect, normalise, and compare contractor quotations received for Mechanical and Electrical (M&E) works. Applies M&E-specific compliance checks (CIDB G7 certification, JKR approved vendor list). QS reviews before proceeding.',
  'procurement',
  ARRAY['Quotation', 'ME', 'Mechanical', 'Electrical', 'Comparison', 'Tender'],
  'bar-chart-2',
  '#7C3AED',
  ARRAY['Manual Trigger', 'Read RFQ Artifact', 'Collect M&E Quotes', 'Normalise Quotes', 'Compare & Score', 'Save Artifact', 'QS Review', 'Logger'],
  30,
  '{
    "version": "1.0.0",
    "nodes": [
      {
        "id": "node-trigger",
        "type": "core.manual_trigger",
        "label": "Start",
        "position": {"x": 60, "y": 200},
        "config": {},
        "inputs": [],
        "outputs": ["trigger_data"]
      },
      {
        "id": "node-read-rfq",
        "type": "project.read_artifact",
        "label": "Load RFQ Package",
        "position": {"x": 280, "y": 200},
        "config": {
          "artifact_key": "rfq_package"
        },
        "inputs": [],
        "outputs": ["documents", "document_count", "_artifact_key"]
      },
      {
        "id": "node-collect",
        "type": "procurement.collect_quotation",
        "label": "Collect M&E Contractor Quotes",
        "position": {"x": 500, "y": 200},
        "config": {
          "trade": "Mechanical & Electrical",
          "min_quotes": 3,
          "deadline_days": 21,
          "require_cidb_g7": true
        },
        "inputs": ["documents"],
        "outputs": ["quotations", "quote_count", "trade"]
      },
      {
        "id": "node-normalise",
        "type": "procurement.normalize_quotation",
        "label": "Normalise Quotes",
        "position": {"x": 720, "y": 200},
        "config": {
          "currency": "MYR",
          "exclude_gst": false
        },
        "inputs": ["quotations"],
        "outputs": ["normalised_quotes", "currency"]
      },
      {
        "id": "node-compare",
        "type": "procurement.compare_quotations",
        "label": "Compare & Score",
        "position": {"x": 940, "y": 200},
        "config": {
          "weight_price": 0.5,
          "weight_compliance": 0.35,
          "weight_experience": 0.15
        },
        "inputs": ["normalised_quotes"],
        "outputs": ["comparison_table", "ranked_quotes", "recommended_contractor"]
      },
      {
        "id": "node-save-artifact",
        "type": "project.save_artifact",
        "label": "Save M&E Comparison",
        "position": {"x": 1160, "y": 200},
        "config": {
          "artifact_key": "mne_quotation"
        },
        "inputs": ["comparison_table", "ranked_quotes", "recommended_contractor"],
        "outputs": ["saved", "artifact_key", "saved_at"]
      },
      {
        "id": "node-approval",
        "type": "core.human_approval",
        "label": "QS Review Comparison",
        "position": {"x": 1380, "y": 200},
        "config": {
          "title": "Review M&E Works Quotation Comparison",
          "assignee_role": "owner"
        },
        "inputs": ["comparison_table"],
        "outputs": ["approved", "comments"]
      },
      {
        "id": "node-logger",
        "type": "core.logger",
        "label": "Log M&E Review Done",
        "position": {"x": 1600, "y": 200},
        "config": {
          "message": "M&E quotation comparison reviewed and approved.",
          "level": "info"
        },
        "inputs": ["approved"],
        "outputs": ["logged"]
      }
    ],
    "edges": [
      {"id": "e1", "source": "node-trigger",        "target": "node-read-rfq"},
      {"id": "e2", "source": "node-read-rfq",       "target": "node-collect"},
      {"id": "e3", "source": "node-collect",        "target": "node-normalise"},
      {"id": "e4", "source": "node-normalise",      "target": "node-compare"},
      {"id": "e5", "source": "node-compare",        "target": "node-save-artifact"},
      {"id": "e6", "source": "node-save-artifact",  "target": "node-approval"},
      {"id": "e7", "source": "node-approval",       "target": "node-logger"}
    ],
    "variables": {},
    "metadata": {
      "name": "Quotation Comparison — M&E Works",
      "description": "Collect, normalise and compare quotations for Mechanical & Electrical trade.",
      "version": "1.0.0",
      "author": "QS-OS"
    }
  }'::jsonb
),

-- ---------------------------------------------------------------------------
-- 4. SUPPLIER RECOMMENDATION & BUDGET SUMMARY
--    Converges after both quotation branches. Reads civil_quotation and
--    mne_quotation artifacts, consolidates into a full project budget,
--    recommends suppliers for each trade, QS gives final sign-off.
-- ---------------------------------------------------------------------------
(
  'supplier-recommendation',
  'Supplier Recommendation & Budget Summary',
  'Consolidate quotation comparisons from all trades, produce a full project budget summary, and formally recommend suppliers for each work package. QS gives final commercial sign-off before award letters are issued.',
  'procurement',
  ARRAY['Supplier', 'Recommendation', 'Budget', 'Summary', 'Award'],
  'award',
  '#B45309',
  ARRAY['Manual Trigger', 'Load Civil Quotes', 'Load M&E Quotes', 'Recommend Suppliers', 'Budget Summary', 'Save Recommendation', 'Final Sign-off', 'Logger'],
  40,
  '{
    "version": "1.0.0",
    "nodes": [
      {
        "id": "node-trigger",
        "type": "core.manual_trigger",
        "label": "Start",
        "position": {"x": 60, "y": 200},
        "config": {},
        "inputs": [],
        "outputs": ["trigger_data"]
      },
      {
        "id": "node-read-civil",
        "type": "project.read_artifact",
        "label": "Load Civil Quotation",
        "position": {"x": 280, "y": 120},
        "config": {
          "artifact_key": "civil_quotation"
        },
        "inputs": [],
        "outputs": ["comparison_table", "ranked_quotes", "recommended_contractor"]
      },
      {
        "id": "node-read-mne",
        "type": "project.read_artifact",
        "label": "Load M&E Quotation",
        "position": {"x": 280, "y": 280},
        "config": {
          "artifact_key": "mne_quotation"
        },
        "inputs": [],
        "outputs": ["comparison_table", "ranked_quotes", "recommended_contractor"]
      },
      {
        "id": "node-recommend",
        "type": "procurement.recommend_supplier",
        "label": "Recommend Suppliers",
        "position": {"x": 540, "y": 200},
        "config": {
          "trades": ["Civil & Structural", "Mechanical & Electrical"],
          "include_rationale": true
        },
        "inputs": ["comparison_table", "ranked_quotes"],
        "outputs": ["recommendations", "recommendation_count"]
      },
      {
        "id": "node-budget",
        "type": "qs.generate_cost_summary",
        "label": "Generate Budget Summary",
        "position": {"x": 760, "y": 200},
        "config": {
          "include_contingency_pct": 10,
          "include_prelims_pct": 8,
          "currency": "MYR"
        },
        "inputs": ["recommendations"],
        "outputs": ["budget_summary", "total_contract_sum", "currency"]
      },
      {
        "id": "node-save-artifact",
        "type": "project.save_artifact",
        "label": "Save Recommendation",
        "position": {"x": 980, "y": 200},
        "config": {
          "artifact_key": "supplier_recommendation"
        },
        "inputs": ["recommendations", "budget_summary", "total_contract_sum"],
        "outputs": ["saved", "artifact_key", "saved_at"]
      },
      {
        "id": "node-approval",
        "type": "core.human_approval",
        "label": "Final QS Commercial Sign-off",
        "position": {"x": 1200, "y": 200},
        "config": {
          "title": "Final Commercial Review — Approve Supplier Recommendation & Budget",
          "assignee_role": "owner"
        },
        "inputs": ["recommendations", "budget_summary", "total_contract_sum"],
        "outputs": ["approved", "comments"]
      },
      {
        "id": "node-logger",
        "type": "core.logger",
        "label": "Pipeline Complete",
        "position": {"x": 1420, "y": 200},
        "config": {
          "message": "Procurement pipeline complete. Supplier recommendation approved. Ready for award letters.",
          "level": "info"
        },
        "inputs": ["approved"],
        "outputs": ["logged"]
      }
    ],
    "edges": [
      {"id": "e1", "source": "node-trigger",        "target": "node-read-civil"},
      {"id": "e2", "source": "node-trigger",        "target": "node-read-mne"},
      {"id": "e3", "source": "node-read-civil",     "target": "node-recommend"},
      {"id": "e4", "source": "node-read-mne",       "target": "node-recommend"},
      {"id": "e5", "source": "node-recommend",      "target": "node-budget"},
      {"id": "e6", "source": "node-budget",         "target": "node-save-artifact"},
      {"id": "e7", "source": "node-save-artifact",  "target": "node-approval"},
      {"id": "e8", "source": "node-approval",       "target": "node-logger"}
    ],
    "variables": {},
    "metadata": {
      "name": "Supplier Recommendation & Budget Summary",
      "description": "Consolidate all trade quotations, recommend suppliers, produce budget summary.",
      "version": "1.0.0",
      "author": "QS-OS"
    }
  }'::jsonb
)

ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  tags        = EXCLUDED.tags,
  color       = EXCLUDED.color,
  preview_nodes = EXCLUDED.preview_nodes,
  sort_order  = EXCLUDED.sort_order,
  definition  = EXCLUDED.definition,
  updated_at  = now();
