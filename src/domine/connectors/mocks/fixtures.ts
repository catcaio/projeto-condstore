import { Order, InventorySnapshot, Shipment } from "../../models";

export const mockOrdersFixtures: Order[] = [
    {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        tenantId: "TEST_TENANT",
        customerId: "e47ac10b-58cc-4372-a567-0e02b2c3d471",
        items: [
            {
                id: "e47ac10b-58cc-4372-a567-0e02b2c3d472",
                productId: "e47ac10b-58cc-4372-a567-0e02b2c3d473",
                quantity: 2,
                unitPrice: 50.0,
                totalPrice: 100.0,
            }
        ],
        totalAmount: 100.0,
        status: "CREATED",
        createdAt: new Date().toISOString()
    }
];

export const mockInventoryFixtures: InventorySnapshot[] = [
    {
        id: "e47ac10b-58cc-4372-a567-0e02b2c3d474",
        tenantId: "TEST_TENANT",
        productId: "e47ac10b-58cc-4372-a567-0e02b2c3d473",
        quantityAvailable: 150,
        quantityReserved: 10,
        createdAt: new Date().toISOString()
    }
];

export const mockShipmentFixtures: Shipment[] = [
    {
        id: "e47ac10b-58cc-4372-a567-0e02b2c3d475",
        tenantId: "TEST_TENANT",
        orderId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        carrier: "Correios",
        trackingCode: "BR123456789XP",
        status: "PENDING",
        createdAt: new Date().toISOString()
    }
];
