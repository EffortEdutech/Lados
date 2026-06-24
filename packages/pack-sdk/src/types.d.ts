import type { NodeManifest } from '@lados/node-sdk';

// ── Resource view configuration (Phase 9 Correction) ─────────────────────────

export interface ResourceInlineAction {
    label: string;
    node: string;
    visibleInStates: string[];
    icon?: string;
    requiresConfirm?: boolean;
}

export interface ResourceListViewConfig {
    primaryField: string;
    secondaryField?: string;
    badgeField?: string;
    counterField?: string;
    mobileLayout?: 'card' | 'row';
}

export interface ResourceViewConfig {
    list: ResourceListViewConfig;
    inlineActions?: ResourceInlineAction[];
}

export interface PackResourceDefinition {
    type: string;
    displayName: string;
    displayNamePlural?: string;
    icon?: string;
    views?: ResourceViewConfig;
}

// ── Pack manifest ───────────────────────────────────�