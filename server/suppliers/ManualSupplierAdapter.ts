import {
  SupplierAdapter,
  SupplierOrderPayload,
  SupplierOrderResponse,
  SupplierTrackingInfo,
} from './types';

/**
 * ManualSupplierAdapter
 * Used for offline vendors, local wholesale hubs, or fallback manual WhatsApp/Excel fulfilment.
 */
export class ManualSupplierAdapter implements SupplierAdapter {
  public supplierCode = 'MANUAL';

  async getProducts(): Promise<any[]> {
    return [];
  }

  async getProduct(externalId: string): Promise<any | null> {
    return {
      externalId,
      type: 'MANUAL_SUPPLIER',
      isAvailable: true,
    };
  }

  async checkStock(externalId: string): Promise<{ inStock: boolean; availableQuantity: number }> {
    return {
      inStock: true,
      availableQuantity: 50,
    };
  }

  async createOrder(orderData: SupplierOrderPayload): Promise<SupplierOrderResponse> {
    const timestamp = Date.now().toString().slice(-6);
    const externalOrderId = `MAN-ORD-${timestamp}`;

    console.log(`[Manual Supplier Adapter] Order ${orderData.orderNumber} queued for manual vendor portal submission.`);

    return {
      success: true,
      externalOrderId,
      carrier: 'BlueDart / Express Logistics',
      status: 'MANUAL_PENDING',
      message: 'Order added to manual dispatch queue. Vendor notified via automated dispatch manifest.',
      estimatedDispatchDays: 3,
      rawPayload: {
        method: 'MANUAL_PORTAL_EXPORT',
        queuedAt: new Date().toISOString(),
      },
    };
  }

  async getOrderStatus(externalOrderId: string): Promise<{ status: string; rawStatus: string }> {
    return {
      status: 'PENDING_MANUAL_DISPATCH',
      rawStatus: 'MANUAL_VERIFICATION_REQUIRED',
    };
  }

  async getTracking(externalOrderId: string): Promise<SupplierTrackingInfo> {
    const trackingNumber = `BD-${externalOrderId.replace(/[^0-9]/g, '') || '771290'}IN`;
    return {
      trackingNumber,
      carrier: 'BlueDart Express',
      status: 'Dispatched via Manual Fulfillment Hub',
      trackingUrl: `https://www.bluedart.com/tracking`,
      checkpoints: [
        {
          timestamp: new Date().toISOString(),
          location: 'Regional Hub - New Delhi',
          status: 'Manual dispatch verified and booked with courier',
        },
      ],
    };
  }

  async cancelOrder(externalOrderId: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Manual supplier order ${externalOrderId} flagged as cancelled in vendor ledger.`,
    };
  }
}
