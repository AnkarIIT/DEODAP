import {
  SupplierAdapter,
  SupplierOrderPayload,
  SupplierOrderResponse,
  SupplierTrackingInfo,
} from './types';

/**
 * MockDeoDapAdapter
 * Simulates DeoDap Wholesale (Surat, Gujarat) dropshipping API.
 * Formatted to be a 1:1 drop-in replacement for the official DeoDap B2B Reseller API.
 */
export class MockDeoDapAdapter implements SupplierAdapter {
  public supplierCode = 'DEODAP';

  async getProducts(): Promise<any[]> {
    return [
      { externalId: 'DD-PROD-01-X', title: '4-in-1 Vegetable Chopper', wholesaleCost: 195, stock: 150 },
      { externalId: 'DD-PROD-06-X', title: 'Sunset Lamp RGB', wholesaleCost: 210, stock: 90 },
      { externalId: 'DD-PROD-08-X', title: 'Astronaut Galaxy Star Projector', wholesaleCost: 590, stock: 210 },
    ];
  }

  async getProduct(externalId: string): Promise<any | null> {
    return {
      externalId,
      supplier: 'DeoDap Wholesale Surat',
      leadTimeDays: 3,
      isAvailable: true,
      apiVerified: true,
    };
  }

  async checkStock(externalId: string): Promise<{ inStock: boolean; availableQuantity: number }> {
    // Simulates live inventory query to DeoDap warehouse
    return {
      inStock: true,
      availableQuantity: 120,
    };
  }

  async createOrder(orderData: SupplierOrderPayload): Promise<SupplierOrderResponse> {
    // Generate realistic DeoDap dispatch order ID
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const externalOrderId = `DD-ORD-${randomSuffix}`;
    const trackingNumber = `DEL-99${randomSuffix}IN`;

    console.log(`[DeoDap Adapter] Dispatching order ${orderData.orderNumber} to Surat hub: ${externalOrderId}`);

    return {
      success: true,
      externalOrderId,
      trackingNumber,
      carrier: 'Delhivery Surface Express',
      status: 'ACCEPTED',
      message: 'DeoDap Surat Warehouse accepted order. Automatic packing queued.',
      estimatedDispatchDays: 2,
      rawPayload: {
        vendor: 'DEODAP_SURAT_B2B',
        awb: trackingNumber,
        dispatchHub: 'Surat Central Logistics',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getOrderStatus(externalOrderId: string): Promise<{ status: string; rawStatus: string }> {
    return {
      status: 'PROCESSING',
      rawStatus: 'DEODAP_PACKING_MANIFESTED',
    };
  }

  async getTracking(externalOrderId: string): Promise<SupplierTrackingInfo> {
    const trackingNumber = `DEL-99${externalOrderId.replace(/[^0-9]/g, '') || '48201'}IN`;
    return {
      trackingNumber,
      carrier: 'Delhivery Surface Express',
      status: 'In Transit',
      trackingUrl: `https://www.delhivery.com/track/package/${trackingNumber}`,
      checkpoints: [
        {
          timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
          location: 'Surat Fulfilment Center, Gujarat',
          status: 'Shipment created and packed by DeoDap',
        },
        {
          timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
          location: 'Ahmedabad Sorting Hub',
          status: 'In transit to destination delivery center',
        },
        {
          timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
          location: 'Destination Delivery Hub',
          status: 'Out for Delivery to customer doorstep',
        },
      ],
    };
  }

  async cancelOrder(externalOrderId: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `DeoDap Order ${externalOrderId} cancelled successfully before warehouse dispatch.`,
    };
  }
}
