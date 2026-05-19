import { describe, it, expect } from "vitest";
import { OrderSchema } from "../models";

describe("Domine Models", () => {
    it("should validate a correct Order", () => {
        const validOrder = {
            id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            tenantId: "TEST_TENANT",
            customerId: "c47ac10b-58cc-4372-a567-0e02b2c3d471".replace('c', 'e'),
            items: [
                {
                    id: "i47ac10b-58cc-4372-a567-0e02b2c3d472".replace('i', 'e'),
                    productId: "p47ac10b-58cc-4372-a567-0e02b2c3d473".replace('p', 'e'),
                    quantity: 1,
                    unitPrice: 100.0,
                    totalPrice: 100.0,
                }
            ],
            totalAmount: 100.0,
            status: "CREATED",
            createdAt: new Date().toISOString()
        };

        const result = OrderSchema.safeParse(validOrder);
        if (!result.success) {
            console.error(result.error);
        }
        expect(result.success).toBe(true);
    });

    it("should reject an invalid Order with missing fields", () => {
        const invalidOrder = {
            id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            tenantId: "TEST_TENANT",
            // missing customerId
            items: [],
            totalAmount: 100.0,
            status: "CREATED",
            createdAt: new Date().toISOString()
        };

        const result = OrderSchema.safeParse(invalidOrder);
        expect(result.success).toBe(false);
    });
});
