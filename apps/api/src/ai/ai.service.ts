/**
 * AiService
 *
 * Phase 9  — Thin wrapper around OpenAI Chat Completions (runCompletion)
 * Phase 10 — Context-aware owner assistant with tool calling + ledger (runAssist)
 *
 * Uses native fetch (Node 18+) — no openai npm package required.
 *
 * ── Security guardrails (non-negotiable) ──────────────────────────────────────
 *  • AI cannot approve, certify, release payment, or create final commercial facts
 *  • approval.decide is restricted to owner|admin roles — never called by AI
 *  • contractor.upload_fuel_receipt: AI extraction is advisory only.
 *    No AI-extracted value may post to finance without owner/admin approval.
 *  • contractor.generate_invoice: cannot be sent without human approval.
 *    AI output must not advance invoice past pending_approval.
 *  • contractor.approve_expense: must appear downstream of foundation.request_approval.
 *    AI cannot approve expenses.
 *  • contractor.approve_payroll: system never initiates bank transfer.
 *    Owner performs bank transfer independently then marks as paid.
 *
 * Sprint 9 (S9-002) / Sprint 10 (S10-004)
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService }           from '../common/supabase/supabase.service';
import { AiContextBuilderService, AiContext } from './ai-context-builder.service';
import {
  AI_TOOL_DEFINITIONS,
  AI_TOOL_NAMES,
  executeToolCall,
  ToolCallResult,
} from './ai-tool-registry';

// ── Phase 9 types ─────────────────────────────────────────────────────────────

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** If true, add response_format: {type:'json_object'} to force JSON output */
  jsonMode?: boolean;
}

// ── Phase 11 types ───────────────────────────────────────────────────────────

export interface ParsedCommandIntent {
  action:                'create' | 'unsupported' | 'unknown';
  resourceType:          string;
  name:                  string;
  data:                  Record<string, unknown>;
  needsClarification:    boolean;
  clarificationQuestion?: string | null;
  summary:               string;
  confidence:            number;
}

// ── Phase 10 types ────────────────────────────────────────────────────────────

export interface AssistMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface AssistRequest {
  orgId:     string;
  actorId:   string;
  role:      string;        // caller's membership role
  message:   string;        // current user message
  sessionId: string;        // owner assigns; groups conversation turns
  /** Prior turns to maintain context (oldest first, caller manages) */
  history?:  AssistMessage[];
}

export interface AssistResponse {
  response:    string;
  sessionId:   string;
  ledgerId:    string;      // lados_ai_outputs row ID
  tokensUsed:  number;
}

// ── OpenAI wire types ─────────────────────────────────────────────────────────

interface OpenAiMessage {
  role:        'system' | 'user' | 'assistant' | 'tool';
  content:     string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
  name?:       string;
}

interface OpenAiToolCall {
  id:       string;
  type:     'function';
  function: { name: string; arguments: string };
}

interface OpenAiCompletionResponse {
  choices: Array<{
    finish_reason: string;
    message: OpenAiMessage;
  }>;
  usage?: {
    prompt_tokens:     number;
    completion_tokens: number;
    total_tokens:      number;
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Lados Owner Assistant — an operational AI built into the Lados Workflow Platform.

You help owners and admins understand their business data: active jobs, t