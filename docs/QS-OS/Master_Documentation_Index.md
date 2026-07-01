# QS-OS Master Documentation Index

**Last updated:** 2026-06-18  
**Architecture version:** V3  
**Repository:** `https://github.com/EffortEdutech/QS-WFUI`

> This index is the single entry point for all QS-OS documentation.  
> Read documents in the order shown for each role below.  
> Where a document is marked **[V3 CURRENT]** it is authoritative.  
> Where marked **[NEEDS V3 UPDATE]** it is valid but contains V1/V2 terminology — read the V3 addendum section at the bottom of that document.  
> Where marked **[SUPERSEDED]** it has been replaced — follow the link to the current replacement.

---

## Reading Guide by Role

### Founder / Product Owner
```
Vol 0  → Product Positioning
Vol 6  → Product Master Blueprint (V2)
V3 Blueprint → V3 Architecture (CURRENT)
Master Sprint Plan → Build progress
```

### New Developer
```
Vol 13 → Developer Setup (start here)
V3 Blueprint → V3 Architecture (CURRENT)
Vol 4  → Workflow JSON Schema
Vol 2  → Skill / Node SDK
Vol 7  → Database Schema
Vol 8  → API Specification
Master Sprint Plan → Current sprint tasks
```

### UI/UX Designer
```
Vol 9  → UI/UX Specification (V2)
Vol 15 → V3 UI/UX Specification (CURRENT)
Switch/Mute/Bypass Reference → Canvas controls
```

### AI Coding Agent (Cowork / Codex)
```
V3 Blueprint → Read first
Master Sprint Plan → Current checklist (tick tasks here)
Vol 4  → Workflow JSON schema
Vol 5  → Execution engine rules
Vol 7  → Database tables
Vol 8  → API endpoints
Vol 13 → Repo structure and setup
```

---

## Complete Document List

### Strategic Documents

| # | File | Title | Era | Status |
|---|---|---|---|---|
| 00 | `Master_Documentation_Index.md` | This document | V3 | ✅ V3 CURRENT |
| 0 | `QS-OS_Volume_0_Product_Positioning_and_Category_Strategy.md` | Product Positioning and Category Strategy | V1 | ⚠️ NEEDS V3 UPDATE — has notice |
| — | `QS-OS_Product_Positioning_Blueprint_V1.md` | Product Positioning Blueprint V1 | V1 | ⚠️ NEEDS V3 UPDATE — has notice |
| — | `QS-OS_V3_Architecture_and_QS-WFUI_Continuation_Blueprint.md` | **V3 Architecture & QS-WFUI Blueprint** | V3 | ✅ V3 CURRENT — primary reference |

### Core Technical Specifications

| # | File | Title | Era | Status |
|---|---|---|---|---|
| 1 | `QS-OS_Workflow_Engine_Blueprint_V1.md` | Workflow Engine Blueprint | V1 | ⚠️ NEEDS V3 UPDATE |
| 2 | `QS-OS_Volume_2_QS_Node_SDK_Specification.md` | Skill / Node SDK Specification | V1 | ⚠️ NEEDS V3 UPDATE — "Node" → "Skill" in V3 |
| 2.1 | `QS-OS_Volume_2_1_QS_Node_Developer_Guide.md` | Skill / Node Developer Guide | V1 | ⚠️ NEEDS V3 UPDATE |
| 3 | `QS-OS_Volume_3_QS_Pack_Specification.md` | Capability Pack Specification | V1 | ⚠️ NEEDS V3 UPDATE — "Pack" → "Capability Pack" in V3 |
| 4 | `QS-OS_Volume_4_Workflow_JSON_Specification.md` | Workflow JSON Specification | V1 | ⚠️ NEEDS V3 UPDATE — V3 adds `skillId`, `packId`, `mode` |
| 5 | `QS-OS_Volume_5_Execution_Engine_Specification.md` | Execution Engine Specification | V1 | ⚠️ NEEDS V3 UPDATE — V3 adds mute/bypass, condition node, core services |
| 6 | `QS-OS_Volume_6_Product_Master_Blueprint_V2.md` | Product Master Blueprint V2 | V2 | ⚠️ SUPERSEDED by V3 Blueprint — keep as history |
| 7 | `QS-OS_Volume_7_Database_Schema_Specification.md` | Database Schema Specification | V1 | ⚠️ NEEDS V3 UPDATE — V3 adds data_packs, core_services, skill metadata columns |
| 8 | `QS-OS_Volume_8_API_Specification.md` | API Specification | V1 | ⚠️ NEEDS V3 UPDATE — V3 adds /data-packs, /services, /nodes/search endpoints |
| 9 | `QS-OS_Volume_9_UI_UX_Product_Specification.md` | UI/UX Product Specification (V2) | V1 | ⚠️ NEEDS V3 UPDATE — superseded for UI by Vol 15 |

### New V3 Specifications (current)

| # | File | Title | Era | Status |
|---|---|---|---|---|
| 11 | `QS-OS_Volume_11_Core_Services_Specification.md` | Core Services Specification | V3 | ✅ V3 CURRENT |
| 12 | `QS-OS_Volume_12_Data_Pack_Specification.md` | Data Pack Specification | V3 | ✅ V3 CURRENT |
| 15 | `QS-OS_Volume_15_V3_UI_UX_Product_Specification.md` | V3 UI/UX Product Specification | V3 | ✅ V3 CURRENT |

### Sprint and Build Documents

| # | File | Title | Era | Status |
|---|---|---|---|---|
| 10 | `QS-OS_Volume_10_MVP_Sprint_Backlog.md` | MVP Sprint Backlog (V1) | V1 | 🚫 SUPERSEDED by Master Sprint Plan |
| 13 | `QS-OS_Volume_13_Developer_Setup_Repository_Implementation_Guide.md` | Developer Setup Guide | V1 | ⚠️ NEEDS V3 UPDATE — V3 stack additions |
| 14 | `QS-OS_Volume_14_MVP_Technical_Task_Pack_for_Codex_Cowork.md` | MVP Technical Task Pack | V1 | 🚫 SUPERSEDED by Master Sprint Plan |
| — | `QS-OS_Master_Sprint_Plan_and_Checklist.md` | **Master Sprint Plan & Checklist** | V3 | ✅ V3 CURRENT — use for all sprint work |

### Design References

| # | File | Title | Era | Status |
|---|---|---|---|---|
| — | `QS-OS_Switch_Mute_Bypass_Group_Design_Reference.md` | Switch / Mute / Bypass / Group Design Reference | V3 | ✅ V3 CURRENT |

---

## V3 Terminology Quick Reference

When reading V1/V2 documents, apply these substitutions mentally:

| V1/V2 term | V3 term |
|---|---|
| Node | Skill |
| Node Library | Skill Library |
| QS Pack / Pack | Capability Pack |
| Data Source | Data Pack |
| Property Panel | Skill Inspector |
| Node execution | Skill execution |
| Run | Execution |
| Workflow output | Artifact / Document |

---

## Missing Documents (planned)

These volumes are defined in the V3 architecture but not yet written:

| Vol | Title | Sprint need |
|---|---|---|
| 16 | Skill SDK Specification (V3 update of Vol 2) | Sprint 16+ |
| 17 | Capability & Data Marketplace Specification | Sprint 15+ |
| 18 | Permission Engine & Security Specification | Sprint 16+ |
| 19 | Notification & Audit Engine Specification | Sprint 14+ |

---

## V3 Architecture: Platform Layer Map

```
QS-OS Platform
│
├── Strategic Docs      → Vol 0, Product Positioning, V3 Blueprint
├── Core Runtime        → Vol 1, Vol 4, Vol 5
├── Skill / Node SDK    → Vol 2, Vol 2.1, (Vol 16 planned)
├── Capability Packs    → Vol 3, (Vol 17 planned)
├── Data Packs          → Vol 12 (new)
├── Core Services       → Vol 11 (new)
├── Database            → Vol 7
├── API                 → Vol 8
├── UI/UX               → Vol 9 (V2), Vol 15 (V3, current)
├── Security            → (Vol 18 planned)
├── Notifications       → (Vol 19 planned)
├── Dev Setup           → Vol 13
└── Build Tracking      → Master Sprint Plan & Checklist
```
