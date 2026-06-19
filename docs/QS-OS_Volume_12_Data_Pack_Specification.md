# QS-OS Workflow Engine Blueprint
# Volume 12 — Data Pack Specification
Version: 1.0 (V3)

> **Document status:** V3 CURRENT  
> **Architecture version:** V3  
> **Created:** 2026-06-18  
> **Source reference:** `QS-OS_V3_Architecture_and_QS-WFUI_Continuation_Blueprint.md` §9  
> **Related documents:** Vol 3 (Capability Pack), Vol 7 (Database), Vol 8 (API), Vol 11 (Core Services)

---

## 1. What is a Data Pack?

A **Data Pack** is a trusted, versioned, installable dataset that provides live or reference business data to QS-OS workflows.

Data Packs answer the question:

```
What does QS-OS know?
```

Capability Packs answer:

```
What can QS-OS do?
```

They are complementary but distinct.

### 1.1 The distinction

| Concept | What it provides | Example |
|---|---|---|
| **Capability Pack** | Skills (executable workflow steps) | "Generate RFQ", "Classify Trade" |
| **Data Pack** | Data (reference data, live market data, catalogues) | "Current steel prices", "Supplier catalogue" |

A skill may *use* a Data Pack but it does not *contain* one. The Data Pack is a separate installable unit that the organization subscribes to.

---

## 2. Data Pack Categories

### 2.1 Price Intelligence Pack

Provides current and historical construction material and labour prices.

```
Price Intelligence Pack
│
├── Material Prices
│   ├── Cement
│   ├── Steel (Y8, Y10, Y12, Y16, Y20, Y25, Y32)
│   ├── Sand (river sand, sharp sand, mining sand)
│   ├── Aggregate (10mm, 20mm, 40mm)
│   ├── Timber (formwork, structural)
│   ├── Paint (interior, exterior, epoxy)
│   ├── Tiles (ceramic, homogeneous, granite)
│   └── ...more materials
│
├── Labour Rates
│   ├── General Worker
│   ├── Skilled Worker (concreting, bricklaying, plastering)
│   ├── Foreman
│   ├── Plant Operator
│   └── Specialist (M&E, structural steel, waterproofing)
│
├── Equipment Rental
│   ├── Tower Crane
│   ├── Mobile Crane
│   ├── Excavator
│   ├── Concrete Pump
│   └── Scaffolding
│
├── Price History
│   └── Monthly price series per material, per region
│
├── Price Confidence
│   └── Data quality score per record
│
└── Regional Adjustment
    └── State multipliers (Selangor, KL, Johor, Penang, Sabah, Sarawak)
```

**Slug:** `price-intelligence`  
**Category:** `price`  
**Update frequency:** Monthly  
**Data source:** Supplier submissions + CIDB + industry survey

---

### 2.2 Supplier Pack (Malaysian)

Registry of verified construction material suppliers in Malaysia.

```
Supplier Pack (MY)
│
├── Company Profile
│   ├── Company name, registration number
│   ├── SSM registration
│   ├── CIDB registration + grade
│   └── Contact persons
│
├── Product Catalogue
│   ├── Materials supplied
│   ├── Brands carried
│   └── Product specifications
│
├── Price List
│   ├── Current unit prices
│   ├── Minimum order quantities
│   └── Bulk discount tiers
│
├── Delivery Info
│   ├── Delivery areas (states covered)
│   ├── Lead time (standard + express)
│   └── Delivery terms (FOB, CIF, site delivery)
│
├── Performance Data
│   ├── Past delivery records
│   ├── On-time delivery rate
│   └── Quality rating
│
└── Certifications
    ├── ISO 9001
    ├── SIRIM
    └── PUSPAKOM (for vehicles)
```

**Slug:** `supplier-my`  
**Category:** `supplier`  
**Update frequency:** Real-time (supplier-maintained)  
**Data source:** Supplier self-registration + QS-OS verification

---

### 2.3 Material Catalogue Pack

Standard construction material reference database with specifications, units, and common descriptions.

```
Material Catalogue Pack
│
├── Concrete
│   ├── Ready-mixed grades (G25, G30, G35, G40, G50)
│   ├── Precast elements
│   └── Specifications (BS 8500, MS EN 206)
│
├── Steel
│   ├── Reinforcement bars (to BS 4449, MS 146)
│   ├── Structural sections (UB, UC, RHS, CHS)
│   └── Stainless steel grades
│
├── Masonry
│   ├── Bricks (common, facing, engineering)
│   ├── Blocks (dense, lightweight, AAC)
│   └── Mortar mixes
│
├── Finishes
│   ├── Plastering (internal, external, sand-cement)
│   ├── Tiles (floor, wall, external)
│   └── Paint systems
│
├── M&E Materials
│   ├── Electrical cables and conduits
│   ├── Plumbing pipes and fittings
│   └── HVAC components
│
└── Standard descriptions
    └── BOQ item descriptions per SMM2 and JKR format
```

**Slug:** `material-catalogue`  
**Category:** `material`  
**Update frequency:** Quarterly  
**Data source:** CIDB, JKR, industry standards bodies

---

### 2.4 Labour Rate Pack

Standard labour output rates and productivity factors for construction activities.

```
Labour Rate Pack
│
├── Civil Works
│   ├── Earthworks (excavation, backfill)
│   ├── Concreting (in-situ, precast)
│   ├── Formwork (timber, system, precast)
│   └── Reinforcement fixing
│
├── Structural Works
│   ├── Structural steel erection
│   ├── Precast installation
│   └── Post-tensioning
│
├── Architectural Works
│   ├── Bricklaying
│   ├── Plastering
│   ├── Tiling
│   └── Painting
│
├── M&E Works
│   ├── Electrical installation
│   ├── Plumbing installation
│   └── HVAC installation
│
├── Output Rates
│   └── m²/day, m/day, unit/day per activity
│
└── Gang Composition
    └── Recommended crew sizes per activity
```

**Slug:** `labour-rates`  
**Category:** `labour`  
**Update frequency:** Annual  
**Data source:** CIDB labour market survey, contractor submissions

---

### 2.5 Construction Cost Index Pack

Historical and projected construction cost indices for tender adjustment and escalation.

```
Construction Cost Index Pack
│
├── CIDB Construction Cost Index (CCI)
│   └── Quarterly series, 2000–present
│
├── BNM Producer Price Index (PPI)
│   └── Monthly series, construction materials
│
├── Escalation Factors
│   └── Regional escalation rates by material category
│
├── Base Date Adjustments
│   └── Calculate adjustment from any base date to present
│
└── Tender Price Index
    └── Regional tender competitiveness indices
```

**Slug:** `cost-index`  
**Category:** `index`  
**Update frequency:** Quarterly  
**Data source:** CIDB, BNM, JKR, Department of Statistics Malaysia

---

### 2.6 Contract Template Pack

Standard construction contract templates and clause libraries.

```
Contract Template Pack
│
├── Main Contracts
│   ├── PAM 2018 (Standard Form)
│   ├── JKR 203A (Government)
│   ├── CIDB 2000 (Standard)
│   └── NEC4 (International)
│
├── Subcontract Forms
│   ├── PAM Sub-Contract 2018
│   └── Domestic Subcontract
│
├── Clause Library
│   ├── Payment clauses
│   ├── Variation clauses
│   ├── Completion and delay clauses
│   ├── Insurance clauses
│   └── Dispute resolution clauses
│
└── Special Conditions
    └── Common special conditions by contract type
```

**Slug:** `contract-templates`  
**Category:** `bq_template`  
**Update frequency:** On standards update  
**Data source:** PAM, JKR, CIDB

---

### 2.7 SMM Standards Pack

Standard Method of Measurement rules and Bill of Quantities formatting standards.

```
SMM Standards Pack
│
├── SMM2 (Standard Method of Measurement, 2nd Edition)
│   ├── Work section rules
│   ├── Item coverage rules
│   └── Measurement rules per trade
│
├── JKR Standard Format
│   ├── Work package structure
│   ├── Item coding system
│   └── Preamble clauses
│
├── NRM (RICS)
│   ├── NRM1 — Cost planning
│   ├── NRM2 — Detailed measurement
│   └── NRM3 — Life cycle costing
│
└── Trade definitions
    └── Standard trade/work package categories
```

**Slug:** `smm-standards`  
**Category:** `standards`  
**Update frequency:** On standards update  
**Data source:** RICS, JKR, CIDB

---

## 3. Data Pack Schema (Database)

See Vol 7 V3 Addendum A2 for the full SQL schema. Key tables:

```sql
data_packs                      -- Pack registry
org_data_pack_installations     -- Which packs each org has installed
```

### 3.1 Example data_packs seed records

```sql
INSERT INTO data_packs (slug, name, category, version, description) VALUES
  ('price-intelligence', 'Price Intelligence Pack', 'price',    '1.0.0', 'Current and historical construction material prices in Malaysia'),
  ('supplier-my',        'Malaysian Supplier Registry', 'supplier', '1.0.0', 'Verified construction suppliers in Malaysia'),
  ('material-catalogue', 'Material Catalogue',      'material', '1.0.0', 'Standard construction material specifications and descriptions'),
  ('labour-rates',       'Labour Rate Pack',         'labour',   '1.0.0', 'Standard labour output rates and gang compositions'),
  ('cost-index',         'Construction Cost Index',  'index',    '1.0.0', 'CIDB and BNM construction cost indices'),
  ('contract-templates', 'Contract Template Pack',   'bq_template','1.0.0','Standard construction contract forms and clause library'),
  ('smm-standards',      'SMM Standards Pack',       'standards','1.0.0', 'Standard Method of Measurement rules and BOQ formats');
```

---

## 4. Skill Dependency Declaration

Skills that consume Data Packs declare this using `data_pack_deps[]` on the `registered_nodes` record:

```sql
-- procurement.match_suppliers requires the supplier data pack
UPDATE registered_nodes SET
  data_pack_deps = ARRAY['supplier-my']
WHERE type = 'procurement.match_suppliers';

-- qs.estimate_cost requires price intelligence
UPDATE registered_nodes SET
  data_pack_deps = ARRAY['price-intelligence', 'material-catalogue']
WHERE type = 'qs.estimate_cost';

-- qs.classify_trade requires SMM standards for trade category lookup
UPDATE registered_nodes SET
  data_pack_deps = ARRAY['smm-standards']
WHERE type = 'qs.classify_trade';
```

At execution time, the engine checks that all declared data packs are installed and active for the project's organization. If a required pack is missing, the node fails with:

```json
{
  "status": "failed",
  "error": "missing_data_pack",
  "missing_packs": ["supplier-my"],
  "message": "The 'Match Suppliers' skill requires the Malaysian Supplier Registry data pack. Install it via Project Settings → Data Packs."
}
```

---

## 5. Data Pack Lifecycle

### 5.1 Installation flow

```
1. Org admin browses Data Pack Browser (QS-WFUI)
2. Admin selects pack and clicks Install
3. Admin provides connection config (API key, region, etc.) if required
4. POST /data-packs/:slug/install creates org_data_pack_installations record
5. Status = "active"
6. Skills in this org can now use the pack
```

### 5.2 Update handling

When a Data Pack releases a new version:

```
1. data_packs record version bumped, status remains "available"
2. Installed orgs receive in-app notification (Notification Service)
3. Org admin can review changelog and confirm update
4. POST /data-packs/:slug/update applies new version
5. No workflow disruption — skills continue running against updated data
```

### 5.3 Uninstall/pause

```
1. Admin pauses or removes a data pack
2. org_data_pack_installations status = "paused"
3. Skills that depend on this pack will fail with "missing_data_pack" until reinstalled
4. Existing execution logs are not affected
```

---

## 6. Data Pack vs Capability Pack — Side by Side

| Attribute | Capability Pack | Data Pack |
|---|---|---|
| Primary content | Skills (executable code) | Data (records, catalogues, reference) |
| Installed per | Platform (global) | Organization |
| Versioning | Code versioned | Schema versioned + data freshness |
| Dependency | Workflow depends on pack | Skill depends on data pack |
| Update impact | May break workflows | Data updated transparently |
| Billing | Included in platform plan | Subscription per pack per org |
| Third-party | Developers publish packs | Data providers publish data packs |

---

## 7. Data Marketplace (Planned — Vol 17)

The Data Pack layer is the foundation of the **QS-OS Data Marketplace**.

In the marketplace model:

```
Data Provider (e.g. CIDB, material supplier, price intelligence firm)
    ↓ Publishes
Data Pack (versioned, structured, verified)
    ↓ Listed in
Data Marketplace (browse, preview, subscribe)
    ↓ Installed by
Organization (pays subscription per pack per month)
    ↓ Consumed by
Skills in project workflows
```

The first two-sided marketplace participant will be the **Supplier Pack**:
- Suppliers subscribe to maintain their own catalogue and price list
- QS-OS verifies and timestamps supplier data
- Contractors and QS users access live supplier market data in their workflows

This creates a **network effect** — the more suppliers on the platform, the more valuable the Supplier Pack becomes, which attracts more contractor organizations, which attracts more suppliers.

---

## 8. Current Implementation Status

| Data Pack | Status | Sprint |
|---|---|---|
| Supplier Pack (MY) | 🔲 Planned — database schema | Sprint 13 |
| Price Intelligence | 🔲 Planned | Sprint 15 |
| Material Catalogue | 🔲 Planned | Sprint 16 |
| Labour Rates | 🔲 Planned | Sprint 17 |
| Cost Index | 🔲 Planned | Sprint 17 |
| Contract Templates | 🔲 Planned | Sprint 18 |
| SMM Standards | 🔲 Planned | Sprint 18 |

**Sprint 13 scope:** Create `data_packs` and `org_data_pack_installations` database tables and seed records. No UI yet — this establishes the foundation.

**Sprint 14 scope:** Wire `data_pack_deps[]` checks into the execution engine.

---

## 9. API Endpoints

See Vol 8 V3 Addendum A1 for full endpoint specification:

```
GET    /data-packs              → List available packs (with installed flag per org)
GET    /data-packs/:slug        → Get pack details + config schema
POST   /data-packs/:slug/install → Install a pack for the org
DELETE /data-packs/:slug/install → Pause/remove installation
```

---

## 10. Security Constraints

1. **Data Pack connection configs may contain API keys.** These must be stored encrypted in `org_data_pack_installations.config` column. Never expose raw config values to the frontend.
2. **Data access is org-scoped.** A skill executing for Organization A must only see data from packs installed by Organization A — never another org's data.
3. **Supplier-submitted price data must be flagged with `source: "supplier_submitted"` and `verificationStatus: "pending"` until validated.** Skills must not use unverified price data in official BOQs without human review.
4. **AI is advisory only.** Skills using Data Pack data to generate estimates or recommendations must clearly label the output as AI-assisted/data-assisted. A registered Professional Quantity Surveyor must review and certify any official cost estimate.

---

## 11. Conclusion

Data Packs are the knowledge layer of QS-OS.

Where Capability Packs give the platform its *capabilities*, Data Packs give it *intelligence* — the ability to know current prices, find the right suppliers, apply the correct standards, and work with real-world construction data instead of generic placeholders.

The combination of Capability Packs + Data Packs + Core Services is what makes QS-OS a true **Business Capability Platform** rather than a generic workflow automation tool.
