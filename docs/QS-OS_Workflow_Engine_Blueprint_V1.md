# QS-OS Workflow Engine Blueprint V1

**Vision**

Build a domain-specific workflow platform for Quantity Surveying that
combines:

-   **ComfyUI philosophy** for visual node composition.
-   **n8n philosophy** for workflow orchestration.
-   **QS expertise** through specialized node packs.

------------------------------------------------------------------------

# Core Philosophy

    User
      ↓
    Visual Workflow Canvas
      ↓
    Connect QS Nodes
      ↓
    Workflow Engine
      ↓
    Business Services
      ↓
    Database / AI / Integrations

The workflow is the business process.

The nodes are reusable business capabilities.

------------------------------------------------------------------------

# Architecture

``` text
                    QS-OS
                        │
         ┌──────────────┴──────────────┐
         │      Workflow Canvas        │
         └──────────────┬──────────────┘
                        │
             Drag & Drop QS Nodes
                        │
    ┌──────────┬────────┼────────┬──────────┐
    │          │        │        │          │
 Core Pack   QS Pack  AI Pack Document Pack Integration Pack
                        │
               Workflow Execution Engine
                        │
       NestJS Services / Business Rules
                        │
                    Supabase
```

------------------------------------------------------------------------

# Node Standard

Every node must expose:

-   Metadata
-   Inputs
-   Outputs
-   Configuration
-   Validation
-   Execution Logic
-   Optional AI Tools
-   Documentation
-   Version

Template:

``` text
Node
├── Metadata
├── Inputs
├── Configuration
├── Processing
├── Tools
├── Outputs
├── Errors
└── Logs
```

------------------------------------------------------------------------

# Workflow Model

``` mermaid
flowchart LR

A([Trigger])
-->B[Input Node]
-->C[Processing Node]
-->D{{Tool / AI}}
-->E{Decision}

E--Yes-->F[(Database)]
E--No-->G[Human Review]

G-->F
F-->H[Output]
H-->I([Notification])
```

------------------------------------------------------------------------

# Packs

## Core Pack

-   Trigger
-   Condition
-   Loop
-   Merge
-   Delay
-   Variables
-   Logging
-   Human Approval

## QS Pack

-   Read BOQ
-   Split Work Packages
-   Measure Quantity
-   Rate Analysis
-   Cost Build-Up
-   Generate BOQ
-   Cost Summary

## Procurement Pack

-   Generate RFQ
-   Supplier Lookup
-   Compare Quotations
-   Recommendation
-   Purchase Order

## Contract Pack

-   Variation Order
-   Interim Claim
-   Payment Certificate
-   Final Account
-   Contract Review

## AI Pack

-   BOQ Classification
-   Drawing Analysis
-   OCR
-   Risk Detection
-   Specification Comparison
-   AI Reviewer

## Document Pack

-   PDF Reader
-   Excel Reader
-   Word Generator
-   PDF Generator
-   Report Generator

## Integration Pack

-   Email
-   WhatsApp
-   Telegram
-   REST API
-   Supabase
-   Storage

------------------------------------------------------------------------

# Example Workflow

``` mermaid
flowchart TD

A([Tender Received])
-->B[Upload BOQ]
-->C[Read Excel]
-->D[Extract Items]
-->E[AI Trade Classification]
-->F[Generate Work Packages]
-->G[Generate RFQ]
-->H[Find Suppliers]
-->I[Send RFQ]
-->J[Collect Quotes]
-->K[AI Comparison]
-->L{Approval}
L--Approved-->M[Purchase Order]
M-->N([Completed])
```

------------------------------------------------------------------------

# Development Phases

## Phase 1

-   Workflow JSON model
-   Node SDK
-   Execution engine
-   Logging
-   Basic node library

## Phase 2

-   React Flow visual editor
-   Property panel
-   Save/load workflows
-   Execution viewer

## Phase 3

-   AI Pack
-   Human approval
-   Templates
-   Scheduling
-   Error recovery

## Phase 4

-   Marketplace for Packs
-   Versioning
-   Multi-tenant support
-   Agent workflows
-   BIM integration

------------------------------------------------------------------------

# Technology Stack

Frontend

-   React
-   React Flow
-   Tailwind CSS

Backend

-   NestJS
-   Workflow Engine
-   BullMQ (optional)
-   WebSockets

Database

-   Supabase PostgreSQL

Storage

-   Supabase Storage

AI

-   OpenAI-compatible providers
-   Local models (optional)

------------------------------------------------------------------------

# Design Principles

1.  One node = one responsibility.
2.  Nodes are reusable.
3.  Workflows represent business processes.
4.  AI is a first-class capability.
5.  Every pack is installable.
6.  Every node follows the same contract.
7.  Human approval can be inserted anywhere.
8.  All executions are logged.
9.  Workflows are versioned.
10. Construction terminology comes first.

------------------------------------------------------------------------

# Long-term Vision

QS-OS becomes a Construction Operating System where users build
solutions by connecting domain-specific packs instead of writing code.

**Formula**

> QS-OS = ComfyUI-style visual builder + n8n-inspired execution engine +
> Quantity Surveying Packs + AI-first architecture.
