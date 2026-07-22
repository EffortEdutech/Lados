# AI Workspace Context

This file is a project-local bridge to the Effort Studio central Obsidian vault.

It exists because some Codex or Claude sessions mount only the project folder. In those sessions, the central vault may be outside the sandbox even though it exists on the machine.

## Central Vault

~~~text
C:\Users\user\Documents\00 AI agent\AI-Knowledge
~~~

## How To Use This File

- Read this file only for architecture rationale, ADR, roadmap, cross-project context, and workspace operating rules.
- Do not use this file as a replacement for project docs or source files.
- If the central vault is accessible, prefer the live vault note listed below.
- If the central vault is not accessible, use this local bridge as the fallback context and mention that the live vault was outside the current sandbox.

## Live Vault Note

~~~text
C:\Users\user\Documents\00 AI agent\AI-Knowledge\Projects\LADOS\Overview.md
~~~

## Synced Project Overview

# LADOS Overview

## Purpose

Lados workflow platform and QS workflow UI monorepo.

## Repository

``text
C:\Users\user\Documents\00 CIPAA contract work dairy\QS-WFUI
``

## Project Docs

Start with:

``text
docs/
``

## AI Setup

Project-local assistant files:

``text
C:\Users\user\Documents\00 CIPAA contract work dairy\QS-WFUI\AGENTS.md
C:\Users\user\Documents\00 CIPAA contract work dairy\QS-WFUI\CLAUDE.md
``

Project-local Graphify wrapper:

``text
C:\Users\user\Documents\00 CIPAA contract work dairy\QS-WFUI\scripts\graphify.ps1
``

## Current Graphify Scope

Initial code graph folders:

- `apps\api\src`
- `apps\web\src`
- `packages\execution-engine\src`
- `packages\node-sdk\src`
- `packages\pack-sdk\src`
- `packages\shared-types\src`
- `packages\workflow-json\src`
- `packs\official\*\src`

Full semantic extraction may require an LLM API key if the repository contains Markdown, office documents, PDFs, images, or other non-code files.

## Related Notes

- [[Architecture/AI Development Workspace]]
- [[Architecture/Graphify + Obsidian Workflow]]
- [[Architecture/Codex + Claude Code Workflow]]

