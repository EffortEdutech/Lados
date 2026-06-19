# QS-OS Workflow Engine Blueprint

# Volume 2.1 — QS Node Developer Guide (V1)

Version: 1.0

> ⚠️ **V3 COMPATIBILITY NOTICE** — Updated: 2026-06-18  
> This guide was written for QS-OS V1. Practical implementation guidance remains valid but terminology has shifted.  
> **V3 terminology:** "QS Node" → "Skill", "Node developer" → "Skill developer", "Pack" → "Capability Pack".  
> Skill implementations in V3 must also declare `uses_services[]` and `data_pack_deps[]`.  
> A new **Vol 16 — Skill SDK Specification** will supersede this guide.  
> **Current authoritative reference:** `QS-OS_V3_Architecture_and_QS-WFUI_Continuation_Blueprint.md`  
> **Document index:** `Master_Documentation_Index.md`

---

> This guide is the implementation manual for developers building custom
> nodes for the QS-OS Workflow Engine.

------------------------------------------------------------------------

# 1. Objectives

The SDK must allow any developer to create reusable QS-OS nodes that:

-   Plug into the visual workflow editor
-   Execute consistently
-   Support AI and human approvals
-   Produce deterministic outputs
-   Are independently testable
-   Can be packaged into reusable Packs

------------------------------------------------------------------------

# 2. Node Architecture

    User
      │
    Workflow Canvas
      │
    Execution Engine
      │
    Node Runtime
      │
    Custom Node

Each node is an isolated execution unit.

------------------------------------------------------------------------

# 3. Node Anatomy

    Node
    ├── Metadata
    ├── UI Definition
    ├── Port Definitions
    ├── Configuration Schema
    ├── Validation
    ├── Execution Logic
    ├── Error Handling
    ├── Output Mapping
    ├── Documentation
    └── Tests

------------------------------------------------------------------------

# 4. Lifecycle

``` mermaid
flowchart TD
A[Register]
-->B[Initialize]
-->C[Load Configuration]
-->D[Receive Inputs]
-->E[Validate]
-->F[Execute]
-->G[Emit Outputs]
-->H[Cleanup]
E-->X[Validation Error]
F-->Y[Execution Error]
```

Lifecycle callbacks:

-   onRegister()
-   onInit()
-   onConfigure()
-   onValidate()
-   onExecute()
-   onSuccess()
-   onError()
-   onCleanup()

------------------------------------------------------------------------

# 5. Metadata Schema

Required:

-   id
-   name
-   version
-   category
-   description
-   icon
-   author
-   license
-   tags

Optional:

-   documentation URL
-   examples
-   changelog

------------------------------------------------------------------------

# 6. Port System

Input Ports

-   String
-   Number
-   Boolean
-   File
-   Object
-   Array
-   BOQ
-   Drawing
-   Contract
-   Supplier

Output Ports

-   Success
-   Failure
-   Warning
-   Approval
-   Report
-   AI Result

Rules:

-   Ports are typed.
-   Multiple outputs are supported.
-   Dynamic ports are permitted.

------------------------------------------------------------------------

# 7. Configuration Schema

Properties should describe:

-   name
-   label
-   type
-   default value
-   validation
-   help text
-   visibility rules

Property types:

-   Text
-   Number
-   Checkbox
-   Dropdown
-   File Picker
-   Secret
-   JSON Editor

------------------------------------------------------------------------

# 8. Execution Context

The runtime injects:

-   Workflow ID
-   Execution ID
-   Project ID
-   User
-   Variables
-   Secrets
-   Database Client
-   Storage Client
-   AI Client
-   Logger
-   Event Bus

Nodes never instantiate these services directly.

------------------------------------------------------------------------

# 9. Validation Framework

Validation stages:

1.  Schema
2.  Required fields
3.  Business rules
4.  Permission checks
5.  External dependency checks

Severity:

-   Info
-   Warning
-   Error

------------------------------------------------------------------------

# 10. Execution Contract

Input

↓

Process

↓

Emit

↓

Log

↓

Next Node

Execution must avoid hidden side effects.

------------------------------------------------------------------------

# 11. Error Strategy

Supported actions:

-   Retry
-   Skip
-   Fail
-   Human Approval
-   Alternate Branch

Retry policy:

-   max attempts
-   delay
-   exponential backoff

------------------------------------------------------------------------

# 12. Human Task SDK

Nodes may pause execution.

Human task contains:

-   Title
-   Description
-   Assignee
-   Due Date
-   Attachments
-   Decision
-   Comments

Workflow resumes after completion.

------------------------------------------------------------------------

# 13. AI SDK

Available services:

-   OCR
-   Classification
-   Extraction
-   Summarization
-   Translation
-   Comparison
-   Recommendation

Best practices:

-   Prompt versioning
-   Confidence score
-   Structured JSON output
-   Token usage logging

------------------------------------------------------------------------

# 14. Logging SDK

Automatic:

-   timestamps
-   duration
-   inputs
-   outputs
-   warnings
-   errors

Custom logs:

-   debug
-   info
-   warning
-   error

------------------------------------------------------------------------

# 15. UI SDK

Node UI includes:

-   Title
-   Icon
-   Category
-   Input Ports
-   Output Ports
-   Property Panel
-   Help Button
-   Status Indicator

States:

-   Idle
-   Running
-   Waiting
-   Success
-   Failed

------------------------------------------------------------------------

# 16. Folder Structure

    MyNode/
    ├── index.ts
    ├── metadata.ts
    ├── schema.ts
    ├── ui.ts
    ├── validator.ts
    ├── executor.ts
    ├── prompts/
    ├── assets/
    ├── tests/
    ├── README.md
    └── CHANGELOG.md

------------------------------------------------------------------------

# 17. Testing

Required tests:

-   Unit
-   Integration
-   Workflow
-   Load
-   Error Recovery

Minimum scenarios:

-   Valid input
-   Missing input
-   Invalid data
-   External service unavailable
-   Permission denied

------------------------------------------------------------------------

# 18. Documentation Template

Each node documents:

-   Purpose
-   Inputs
-   Outputs
-   Configuration
-   Example Workflow
-   Limitations
-   Performance Notes
-   Troubleshooting
-   Version History

------------------------------------------------------------------------

# 19. Example: Read BOQ Node

Purpose:

Read an Excel BOQ and output normalized BOQ items.

Inputs:

-   Excel file

Configuration:

-   Sheet
-   Header Row
-   Currency

Outputs:

-   Items
-   Warnings
-   Errors

Dependencies:

-   Excel Parser

------------------------------------------------------------------------

# 20. Example: Compare Quotation Node

Inputs:

-   Supplier quotations

Configuration:

-   Comparison model
-   Weighting
-   Currency

Outputs:

-   Ranked suppliers
-   Cost summary
-   Recommendation

AI Optional:

-   Explain recommendation

------------------------------------------------------------------------

# 21. Coding Standards

-   Single responsibility
-   Dependency injection
-   Strong typing
-   No global state
-   Pure functions where practical
-   Comprehensive comments
-   Semantic versioning

------------------------------------------------------------------------

# 22. Performance

Nodes should:

-   Stream large files
-   Support batching
-   Avoid blocking operations
-   Emit progress events
-   Handle cancellation

------------------------------------------------------------------------

# 23. Security

Never:

-   Store secrets in code
-   Log confidential data
-   Bypass permissions

Always:

-   Use execution context
-   Validate permissions
-   Encrypt sensitive values

------------------------------------------------------------------------

# 24. Pack Readiness Checklist

-   Metadata complete
-   UI complete
-   Validation complete
-   Tests passing
-   Documentation complete
-   Version tagged
-   Examples included
-   Performance reviewed

------------------------------------------------------------------------

# 25. Future SDK Extensions

-   Agent Nodes
-   BIM Nodes
-   Realtime Collaboration
-   Marketplace Publishing
-   Node Analytics
-   Visual Debugger
-   Workflow Recorder

------------------------------------------------------------------------

# Conclusion

The QS Node SDK is intended to become the stable foundation for an
ecosystem of installable Packs. Every node follows the same lifecycle,
interfaces, validation rules, execution contract, and documentation
standards, allowing developers to focus on solving Quantity Surveying
problems while maintaining compatibility across the entire QS-OS
platform.
