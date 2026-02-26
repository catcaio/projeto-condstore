import { z } from "zod";

export const BaseDomineModel = z.object({
    id: z.string().uuid(),
    tenantId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
});

export const OrderItemSchema = z.object({
    id: z.string().uuid(),
    productId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    totalPrice: z.number().positive(),
});

export const OrderSchema = BaseDomineModel.extend({
    customerId: z.string().uuid(),
    items: z.array(OrderItemSchema),
    totalAmount: z.number().positive(),
    status: z.enum(["CREATED", "PAID", "SHIPPED", "DELIVERED", "CANCELED"]),
});

export const CustomerSchema = BaseDomineModel.extend({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    document: z.string().optional(), // CPF/CNPJ
});

export const ProductSchema = BaseDomineModel.extend({
    name: z.string().min(1),
    sku: z.string().min(1),
    price: z.number().positive(),
    isActive: z.boolean().default(true),
});

export const InventorySnapshotSchema = BaseDomineModel.extend({
    productId: z.string(),
    quantityAvailable: z.number().int().min(0),
    quantityReserved: z.number().int().min(0),
});

export const PaymentSchema = BaseDomineModel.extend({
    orderId: z.string().uuid(),
    amount: z.number().positive(),
    method: z.enum(["CREDIT_CARD", "PIX", "BOLETO", "OTHER"]),
    status: z.enum(["PENDING", "APPROVED", "FAILED", "REFUNDED"]),
});

export const InvoiceSchema = BaseDomineModel.extend({
    orderId: z.string().uuid(),
    number: z.string(),
    series: z.string().optional(),
    issuedAt: z.string().datetime(),
    status: z.enum(["ISSUED", "CANCELED", "WAITING_AUTHORIZATION"]),
    xmlUrl: z.string().url().optional(),
    pdfUrl: z.string().url().optional(),
});

export const ShipmentSchema = BaseDomineModel.extend({
    orderId: z.string().uuid(),
    carrier: z.string(),
    trackingCode: z.string().optional(),
    status: z.enum(["PENDING", "LABEL_CREATED", "DISPATCHED", "IN_TRANSIT", "DELIVERED"]),
});

export const ConnectorAccountSchema = BaseDomineModel.extend({
    connectorId: z.string(),
    name: z.string(),
    isActive: z.boolean(),
    credentials: z.record(z.string(), z.string()), // e.g. apiKey, secret
});

export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type InventorySnapshot = z.infer<typeof InventorySnapshotSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
export type ConnectorAccount = z.infer<typeof ConnectorAccountSchema>;
