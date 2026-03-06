/**
 * action-types.ts
 * Canonical scopes, action types, and status values for the Action Engine.
 */

// ── Scopes ────────────────────────────────────────────────────────────────────

export const ACTION_SCOPES = ['ADS', 'CRM', 'WHATSAPP', 'FREIGHT', 'PRICING'] as const;
export type ActionScope = (typeof ACTION_SCOPES)[number];

export function isValidActionScope(v: string): v is ActionScope {
    return (ACTION_SCOPES as readonly string[]).includes(v);
}

// ── Action Types ──────────────────────────────────────────────────────────────

export const ADS_ACTIONS = {
    ADJUST_CAMPAIGN_BUDGET: 'adjust_campaign_budget',
    PAUSE_CAMPAIGN: 'pause_campaign',
    RESUME_CAMPAIGN: 'resume_campaign',
} as const;

export const CRM_ACTIONS = {
    TRIGGER_REACTIVATION_SEQUENCE: 'trigger_reactivation_sequence',
    TAG_CUSTOMER_SEGMENT: 'tag_customer_segment',
} as const;

export const WHATSAPP_ACTIONS = {
    UPDATE_AUTO_REPLY_FLOW: 'update_auto_reply_flow',
    TRIGGER_FOLLOWUP_SEQUENCE: 'trigger_followup_sequence',
} as const;

export const FREIGHT_ACTIONS = {
    ADJUST_QUOTE_MARGIN: 'adjust_quote_margin',
    ADJUST_DELIVERY_PRIORITY: 'adjust_delivery_priority',
} as const;

export const PRICING_ACTIONS = {
    ADJUST_CHECKOUT_INCENTIVE: 'adjust_checkout_incentive',
} as const;

export const ALL_ACTION_TYPES = {
    ...ADS_ACTIONS,
    ...CRM_ACTIONS,
    ...WHATSAPP_ACTIONS,
    ...FREIGHT_ACTIONS,
    ...PRICING_ACTIONS,
} as const;

export type ActionType = (typeof ALL_ACTION_TYPES)[keyof typeof ALL_ACTION_TYPES];

/**
 * Maps action type → its required scope (for permission checks).
 */
export const ACTION_TYPE_TO_SCOPE: Record<string, ActionScope> = {
    adjust_campaign_budget: 'ADS',
    pause_campaign: 'ADS',
    resume_campaign: 'ADS',
    trigger_reactivation_sequence: 'CRM',
    tag_customer_segment: 'CRM',
    update_auto_reply_flow: 'WHATSAPP',
    trigger_followup_sequence: 'WHATSAPP',
    adjust_quote_margin: 'FREIGHT',
    adjust_delivery_priority: 'FREIGHT',
    adjust_checkout_incentive: 'PRICING',
};

// ── Status ────────────────────────────────────────────────────────────────────

export const ACTION_STATUSES = ['PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];
