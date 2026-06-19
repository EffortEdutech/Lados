# QS-OS Workflow Engine Blueprint
# Volume 11 — Core Services Specification
Version: 1.0 (V3)

> **Document status:** V3 CURRENT  
> **Architecture version:** V3  
> **Created:** 2026-06-18  
> **Source reference:** `QS-OS_V3_Architecture_and_QS-WFUI_Continuation_Blueprint.md` §10  
> **Related documents:** Vol 5 (Execution Engine), Vol 7 (Database), Vol 8 (API), Vol 12 (Data Packs)

---

## 1. What are Core Services?

Core Services are the **platform infrastructure layer** of QS-OS.

They sit between Skills (nodes) and external providers. Skills do not call external APIs directly — they call Core Services, which handle provider routing, fallback, rate limiting, cost tracking, and audit logging transparently.

```
Workflow Execution
    ↓
Skill / Node
    ↓ calls
Core Services Layer
    ├── AI Service         → OpenAI / Anthropic / local model
    ├── OCR Service        → Azure Document Intelligence / Tesseract
    ├── Document Service   → PDF, Word, Excel generation
    ├── Geometry Service   → Area calc, takeoff engine
    ├── Storage Service    → Supabase Storage / S3
    ├── Search Service     → Vector search, full-text search
    ├── Notification Service → Email, in-app, webhook
    ├── Billing Service    → Usage metering, quota management
    └── Audit Service      → Immutable event log
```

Core Services are **not visible to business users**. They are an infrastructure contract between the platform and the skills that run on it.

---

## 2. Why Core Services?

Without a Core Services layer, skills become fragile:

| Problem | Without Core Services | With Core Services |
|---|---|---|
| AI provider change | Every skill that calls OpenAI must be updated | Update AI Service provider config only |
| Rate limiting | Each skill handles it differently | Core Services enforces org-level rate limits |
| Billing | Skills can't track their own costs | Billing Service meters usage automatically |
| Audit | Skills emit their own logs inconsistently | Audit Service receives structured events from every service call |
| Testability | Skills need real external APIs to test | Skills can be tested against service mocks |

---

## 3. Core Services Catalogue

### 3.1 AI Service

**Purpose:** Provides LLM inference, text classification, generation, and structured output extraction to skills.

**Responsibilities:**
- Accept structured prompt requests from skills
- Route to configured provider (OpenAI, Anthropic, local)
- Return structured responses
- Track token usage and cost
- Apply rate limits per organization
- Log every call to audit service

**Supported providers:**
- `openai` — GPT-4o, GPT-4o-mini, GPT-4
- `anthropic` — Claude Sonnet, Claude Haiku
- `local` — Ollama, LM Studio (for on-premise deployments)

**Skill contract:**

```typescript
interface AiServiceRequest {
  model?:       string;           // optional override; service picks default
  systemPrompt: string;
  userPrompt:   string;
  outputFormat: 'text' | 'json' | 'structured';
  schema?:      object;           // JSON Schema for structured output
  maxTokens?:   number;
  temperature?: number;
}

interface AiServiceResponse {
  text?:       string;
  json?:       object;
  tokensUsed:  number;
  cost:        number;            // USD, for billing
  provider:    string;
  model:       string;
  durationMs:  number;
}
```

**Current implementation:** `apps/api/src/ai/ai.service.ts` — wraps OpenAI SDK, falls back to keyword extraction.

---

### 3.2 OCR Service

**Purpose:** Extracts text, tables, and structured data from scanned documents, PDFs, and images.

**Responsibilities:**
- Accept file references (Supabase Storage URL or upload ID)
- Apply OCR using configured provider
- Return extracted text, tables, and bounding boxes
- Handle multi-page documents
- Track usage for billing

**Supported providers:**
- `azure` — Azure Document Intelligence (Form Recognizer)
- `tesseract` — Open-source fallback for simple PDFs
- `pdf_text` — Direct text extraction for non-scanned PDFs (zero cost)

**Skill contract:**

```typescript
interface OcrServiceRequest {
  fileId?:   string;         // Supabase Storage file reference
  fileUrl?:  string;         // Direct URL
  mode:      'text' | 'tables' | 'full';
  language?: string;         // ISO 639-1, default 'en'
  pages?:    number[];       // specific pages only
}

interface OcrServiceResponse {
  text:     string;
  tables:   OcrTable[];
  pages:    number;
  provider: string;
  confidence: number;        // 0–1
  durationMs: number;
}

interface OcrTable {
  page:    number;
  rows:    string[][];
  headers: string[];
}
```

**MVP note:** OCR Service is planned for Sprint 14. Current MVP reads Excel and PDF text directly without OCR.

---

### 3.3 Document Service

**Purpose:** Generates, transforms, and exports business documents (PDF, Word, Excel).

**Responsibilities:**
- Generate PDFs from templates + data
- Generate Word documents from templates
- Generate Excel spreadsheets from structured data
- Convert between formats (DOCX → PDF, etc.)
- Return generated files via Storage Service

**Supported operations:**

| Operation | Input | Output | Provider |
|---|---|---|---|
| `generate_pdf` | Template + data | PDF file | Puppeteer / PDFKit |
| `generate_docx` | Template + data | Word file | docxtemplater |
| `generate_xlsx` | Schema + rows | Excel file | xlsx / SheetJS |
| `convert_to_pdf` | DOCX or HTML | PDF file | LibreOffice / Puppeteer |
| `extract_tables` | PDF or XLSX | Structured JSON | Apache POI / xlsx |

**Skill contract:**

```typescript
interface DocumentServiceRequest {
  operation: 'generate_pdf' | 'generate_docx' | 'generate_xlsx' | 'convert_to_pdf' | 'extract_tables';
  templateId?: string;       // from template registry
  data?:       object;       // template variables
  fileId?:     string;       // for conversion/extraction operations
  outputName?: string;       // desired filename
}

interface DocumentServiceResponse {
  fileId:      string;       // Storage Service reference
  fileUrl:     string;       // signed download URL
  mimeType:    string;
  sizeBytes:   number;
  durationMs:  number;
}
```

**Current implementation:** `document.read_excel` and `document.read_boq` nodes handle basic Excel reading directly. Sprint 14 will refactor these to use Document Service.

---

### 3.4 Geometry Service

**Purpose:** Performs spatial calculations, takeoffs, and quantity extraction from drawings.

**Responsibilities:**
- Parse PDF drawings for scale detection
- Detect geometric elements (walls, slabs, rooms, columns, beams)
- Measure lengths, areas, volumes
- Apply scale correction
- Return structured quantity data

**Supported operations:**

| Operation | Description |
|---|---|
| `detect_scale` | Find drawing scale from title block or notation |
| `detect_elements` | Detect walls, columns, slabs, rooms in a drawing |
| `measure_area` | Calculate area of a polygon or room boundary |
| `measure_length` | Calculate total length of linear elements |
| `measure_volume` | Calculate volume from plan + section information |
| `takeoff_summary` | Full quantity takeoff — returns structured BOQ quantities |

**MVP note:** Geometry Service is planned for Sprint 16+. Not in active sprint scope yet.

---

### 3.5 Storage Service

**Purpose:** Manages file upload, download, and lifecycle for all project files and generated artifacts.

**Responsibilities:**
- Store uploaded files securely (per-org bucket)
- Generate signed URLs for upload and download
- Track file metadata (name, size, type, uploader, project)
- Handle file deletion and TTL expiry
- Enforce storage quotas per organization

**Backed by:** Supabase Storage (current implementation)

**Skill contract:**

```typescript
interface StorageUploadRequest {
  file:       Buffer | ReadableStream;
  filename:   string;
  mimeType:   string;
  projectId?: string;
  metadata?:  object;
}

interface StorageUploadResponse {
  fileId:    string;         // references uploads or project_files table
  fileUrl:   string;         // signed URL
  path:      string;         // bucket path
  sizeBytes: number;
}
```

**Current implementation:** Supabase Storage bucket `project-files`. Managed via `uploads` table and `project_files` table.

---

### 3.6 Search Service

**Purpose:** Provides full-text and semantic search over project documents, suppliers, and knowledge bases.

**Responsibilities:**
- Full-text search over project documents
- Semantic / vector search over embedded content
- Supplier name and product search
- Workflow template search

**Modes:**

| Mode | Technology | Use case |
|---|---|---|
| `keyword` | PostgreSQL `tsvector` | Simple text search |
| `semantic` | pgvector / embeddings | "Find similar BOQ items" |
| `hybrid` | Both | Best results for production search |

**MVP note:** Search Service is planned for Sprint 17+. Current MVP uses simple SQL ILIKE queries.

---

### 3.7 Notification Service

**Purpose:** Sends notifications to users via multiple channels when workflow events occur.

**Responsibilities:**
- Send in-app notifications (Supabase Realtime)
- Send email notifications (transactional email)
- Send webhook notifications to external systems
- Queue and retry failed notifications
- Respect user notification preferences

**Trigger events:**

| Event | Recipients | Default channel |
|---|---|---|
| Approval requested | Approvers | In-app + email |
| Approval completed | Workflow owner | In-app |
| Execution failed | Workflow owner | In-app + email |
| Execution completed | Workflow owner | In-app |
| Data Pack updated | Org admin | In-app |
| Quota warning | Org admin | Email |

**MVP note:** Approval notification is implemented as a log entry. Real notifications are planned for Sprint 14 (S14-007).

---

### 3.8 Billing Service

**Purpose:** Tracks resource consumption and enforces quotas per organization.

**Responsibilities:**
- Track AI token usage per org per month
- Track OCR page usage per org per month
- Track storage usage per org
- Enforce per-org quota limits
- Expose usage dashboard data via API
- Trigger overage alerts to Notification Service

**Billable resources:**

| Resource | Unit | Tracked by |
|---|---|---|
| AI inference | Token | AI Service |
| OCR processing | Page | OCR Service |
| Document generation | Document | Document Service |
| Storage | GB-month | Storage Service |
| Execution runs | Run | Execution Engine |

**MVP note:** Billing Service tracking is planned for Sprint 18+. Current MVP has no usage metering.

---

### 3.9 Audit Service

**Purpose:** Records an immutable log of all significant platform events for compliance and debugging.

**Responsibilities:**
- Accept structured event records from all other services
- Store events in append-only audit log table
- Provide query API for audit viewers
- Support event filtering by org, project, workflow, user, date

**Event schema:**

```typescript
interface AuditEvent {
  id:         string;        // uuid
  timestamp:  string;        // ISO 8601
  org_id:     string;
  project_id?: string;
  workflow_id?: string;
  execution_id?: string;
  actor:      string;        // user ID or "system"
  action:     string;        // e.g. "skill.executed", "approval.granted"
  resource:   string;        // e.g. "node:qs.classify_trade"
  result:     'success' | 'failure' | 'skipped';
  details:    object;        // action-specific data
}
```

**Current implementation:** `audit_logs` table (migration 0010). Basic entries written by execution engine and approval flow. Full audit service abstraction is Sprint 19.

---

## 4. Service Registration Table

The `core_services` database table (see Vol 7 V3 Addendum A1) stores the registry of enabled services:

```sql
SELECT name, display_name, provider, status FROM core_services;

-- name            display_name          provider    status
-- ai              AI Service            openai      active
-- ocr             OCR Service           azure       active
-- document        Document Service      internal    active
-- geometry        Geometry Service      internal    planned
-- storage         Storage Service       supabase    active
-- search          Search Service        internal    planned
-- notification    Notification Service  internal    planned
-- billing         Billing Service       internal    planned
```

---

## 5. Service Dependency Declaration

Every Skill declares which Core Services it requires using the `uses_services[]` field on the `registered_nodes` record:

```sql
-- Example: qs.classify_trade requires AI and Audit services
UPDATE registered_nodes SET
  uses_services = ARRAY['ai', 'audit']
WHERE type = 'qs.classify_trade';

-- Example: document.read_excel requires Storage and Audit
UPDATE registered_nodes SET
  uses_services = ARRAY['storage', 'audit']
WHERE type = 'document.read_excel';

-- Example: core.human_approval requires Auth, Notification, Audit
UPDATE registered_nodes SET
  uses_services = ARRAY['auth', 'notification', 'audit']
WHERE type = 'core.human_approval';
```

The execution engine checks these declarations at runtime before dispatching the skill. If a required service is `offline` or `not configured`, the node fails with reason `service_unavailable`.

---

## 6. Current Implementation Status

| Service | Status | Sprint |
|---|---|---|
| AI Service | ✅ Built (`apps/api/src/ai/ai.service.ts`) | Sprint 9 |
| Storage Service | ✅ Built (Supabase Storage bucket) | Sprint 7 |
| Document Service (read) | ✅ Partial (Excel/PDF read nodes) | Sprint 7–8 |
| Document Service (generate) | 🔲 Planned | Sprint 14 |
| Audit Service | ✅ Partial (audit_logs table, basic writes) | Sprint 10 |
| OCR Service | 🔲 Planned | Sprint 14 |
| Notification Service | 🔲 Planned | Sprint 14 |
| Geometry Service | 🔲 Planned | Sprint 16+ |
| Search Service | 🔲 Planned | Sprint 17+ |
| Billing Service | 🔲 Planned | Sprint 18+ |

---

## 7. API Exposure

Core Services are accessible via the API as described in Vol 8 V3 Addendum A2:

```
GET  /services        → List all services and their status
GET  /services/:name  → Get a specific service and its health
```

These endpoints are read-only for service consumers. Service configuration is done by platform administrators via direct database access or admin panel (planned Sprint 18).

---

## 8. Security Constraints

> ⛔ **CRITICAL SECURITY RULES — these apply to all Core Services:**

1. **Service keys and provider credentials are NEVER stored in frontend `.env` files.** They live in `apps/api/.env` only, accessed only by the NestJS backend.
2. **AI prompts and configurations are NEVER exposed to frontend users directly.** The AI Service API accepts structured requests; prompts are stored in the `ai_prompts` database table server-side.
3. **Audit Service events are append-only.** No service or skill may update or delete existing audit events.
4. **The Billing Service quota check must run BEFORE a billable service call is dispatched.** Skills must not bypass quota checks.
5. **AI is advisory only.** AI Service outputs are never used as the final authority for decisions requiring a registered Professional Quantity Surveyor. The platform must ensure AI-generated content is clearly labelled as AI-generated in all documents and artifact outputs.

---

## 9. Conclusion

Core Services are the invisible infrastructure that makes QS-OS skills reusable, reliable, and auditable.

A skill should be able to say: "I need AI, Storage, and Audit." The execution engine provisions those services for the skill, meters the usage, and ensures every action is logged — without the skill author having to write a single line of infrastructure code.

This is what transforms QS-OS from a workflow runner into a **Business Capability Platform**.
