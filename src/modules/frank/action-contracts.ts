import { z } from 'zod';

// ==========================================
// Base Explainability Contract
// ==========================================
export const ExplainabilitySchema = z.object({
  what: z.string().describe("A summary of what the action does"),
  why: z.string().describe("The business reason or trigger for this action"),
  impact: z.string().describe("What will change after this execution"),
  risk: z.enum(['low', 'medium', 'high']).describe("Risk level of automating this action"),
  rollback: z.boolean().describe("Whether this action can be easily reversed"),
});
export type Explainability = z.infer<typeof ExplainabilitySchema>;

// ==========================================
// CRM Action Contracts
// ==========================================
export const CrmMoveOpportunityStagePayload = z.object({
  opportunityId: z.string(),
  newStage: z.enum(['novo', 'qualificado', 'cotado', 'proposta_enviada', 'aguardando_resposta', 'ganho', 'perdido']),
  reasoning: z.string().optional(),
});

export const CrmAssignOpportunityOwnerPayload = z.object({
  opportunityId: z.string(),
  newOwnerId: z.string(),
  newOwnerName: z.string().optional(),
});

export const CrmCreateFollowUpPayload = z.object({
  opportunityId: z.string(),
  scheduledAt: z.string().datetime(), // ISO 8601
  description: z.string(),
});

export const CrmRegisterLossReasonPayload = z.object({
  opportunityId: z.string(),
  lossReason: z.string(),
});

export const CrmMarkOpportunityTemperaturePayload = z.object({
  opportunityId: z.string(),
  temperature: z.enum(['frio', 'morno', 'quente']),
});

// ==========================================
// Orders Action Contracts
// ==========================================
export const OrderUpdateStatusPayload = z.object({
  orderId: z.string(),
  newStatus: z.enum(['recebido', 'validacao', 'producao', 'separacao', 'faturado', 'enviado', 'entregue', 'cancelado', 'excecao']),
});

export const OrderAssignOwnerPayload = z.object({
  orderId: z.string(),
  newOwnerId: z.string(),
  newOwnerName: z.string().optional(),
});

export const OrderFlagRiskPayload = z.object({
  orderId: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
});

export const OrderOpenExceptionPayload = z.object({
  orderId: z.string(),
  exceptionType: z.string(),
  description: z.string(),
});

// ==========================================
// Logistics Action Contracts
// ==========================================
export const LogisticsUpdateShipmentStatusPayload = z.object({
  shipmentId: z.string(),
  newStatus: z.enum(['aguardando-cotacao', 'cotado', 'coletado', 'em-transito', 'saiu-para-entrega', 'entregue', 'excecao', 'cancelado']),
});

export const LogisticsFlagDelayPayload = z.object({
  shipmentId: z.string(),
  delayReason: z.string(),
  newEstimatedDeliveryDate: z.string().datetime().optional(),
});

export const LogisticsAssignOwnerPayload = z.object({
  shipmentId: z.string(),
  newOwnerId: z.string(),
  newOwnerName: z.string().optional(),
});

export const LogisticsCreateFollowUpPayload = z.object({
  shipmentId: z.string(),
  scheduledAt: z.string().datetime(),
  description: z.string(),
});

// ==========================================
// Conversations Action Contracts
// ==========================================
export const ConversationAssignOwnerPayload = z.object({
  conversationId: z.string(),
  newOwnerId: z.string(),
  newOwnerName: z.string().optional(),
});

export const ConversationSetPriorityPayload = z.object({
  conversationId: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
});

export const ConversationScheduleFollowUpPayload = z.object({
  conversationId: z.string(),
  scheduledAt: z.string().datetime(),
  description: z.string(),
});

export const ConversationApproveSuggestedReplyPayload = z.object({
  conversationId: z.string(),
  replyText: z.string(),
});

// ==========================================
// Registry (Map of String to Zod Schema)
// ==========================================
export const FrankActionRegistry = {
  // CRM
  crm_move_opportunity_stage: CrmMoveOpportunityStagePayload,
  crm_assign_opportunity_owner: CrmAssignOpportunityOwnerPayload,
  crm_create_follow_up: CrmCreateFollowUpPayload,
  crm_register_loss_reason: CrmRegisterLossReasonPayload,
  crm_mark_opportunity_temperature: CrmMarkOpportunityTemperaturePayload,

  // Orders
  order_update_status: OrderUpdateStatusPayload,
  order_assign_owner: OrderAssignOwnerPayload,
  order_flag_risk: OrderFlagRiskPayload,
  order_open_exception: OrderOpenExceptionPayload,

  // Logistics
  logistics_update_shipment_status: LogisticsUpdateShipmentStatusPayload,
  logistics_flag_delay: LogisticsFlagDelayPayload,
  logistics_assign_owner: LogisticsAssignOwnerPayload,
  logistics_create_follow_up: LogisticsCreateFollowUpPayload,

  // Conversations
  conversation_assign_owner: ConversationAssignOwnerPayload,
  conversation_set_priority: ConversationSetPriorityPayload,
  conversation_schedule_follow_up: ConversationScheduleFollowUpPayload,
  conversation_approve_suggested_reply: ConversationApproveSuggestedReplyPayload,
} as const;

export type FrankActionType = keyof typeof FrankActionRegistry;

export function getActionSchema(type: FrankActionType) {
  return FrankActionRegistry[type];
}
