import { db } from '../db';
import {
  CreatePaymentParams,
  PaymentInitializationResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './types';

/**
 * MockPaymentProvider
 * For instant sandbox testing without waiting for bank transfers.
 */
export class MockPaymentProvider implements PaymentProvider {
  public providerName = 'MOCK_GATEWAY';

  async createPayment(params: CreatePaymentParams): Promise<PaymentInitializationResult> {
    const paymentId = `pay-mock-${Date.now()}`;
    const transactionRef = `TXN_MOCK_${Math.floor(100000 + Math.random() * 900000)}`;

    db.addPayment(params.orderId, {
      id: paymentId,
      orderId: params.orderId,
      method: 'MOCK_GATEWAY',
      status: 'COMPLETED',
      amount: params.amount,
      currency: 'INR',
      transactionRef,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      notes: 'Sandbox instant payment verified',
    });

    return {
      paymentId,
      method: 'MOCK_GATEWAY',
      status: 'COMPLETED',
      amount: params.amount,
      currency: 'INR',
      message: 'Sandbox payment automatically authorized.',
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    return {
      verified: true,
      status: 'COMPLETED',
      transactionRef: `TXN_MOCK_VERIFIED`,
      message: 'Instant test verification confirmed.',
      verifiedAt: new Date().toISOString(),
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Mock refund of ₹${amount} simulated instantly.`,
    };
  }
}
