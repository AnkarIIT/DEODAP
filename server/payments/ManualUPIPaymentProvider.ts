import { db } from '../db';
import {
  CreatePaymentParams,
  PaymentInitializationResult,
  PaymentProvider,
  PaymentVerificationResult,
} from './types';

/**
 * ManualUPIPaymentProvider
 * Implements NPCI-compliant standard UPI Intent URI and UTR validation flow.
 * Zero-budget model designed for easy replacement with Razorpay / Cashfree UPI Gateway.
 */
export class ManualUPIPaymentProvider implements PaymentProvider {
  public providerName = 'MANUAL_UPI';

  async createPayment(params: CreatePaymentParams): Promise<PaymentInitializationResult> {
    const settings = db.getSettings();
    const payeeVpa = settings.upiMerchantId || '8235058525@sbi';
    const payeeName = settings.upiMerchantName || 'Shoply';

    // Standard NPCI UPI URI Specification
    const encodedName = encodeURIComponent(payeeName);
    const note = encodeURIComponent(`Order ${params.orderNumber}`);
    const upiUri = `upi://pay?pa=${payeeVpa}&pn=${encodedName}&am=${params.amount.toFixed(2)}&cu=INR&tn=${note}`;

    const paymentId = `pay-upi-${Date.now()}`;

    // Record in database
    db.addPayment(params.orderId, {
      id: paymentId,
      orderId: params.orderId,
      method: 'UPI_MANUAL',
      status: 'PENDING',
      amount: params.amount,
      currency: 'INR',
      createdAt: new Date().toISOString(),
      notes: `Awaiting customer transfer to ${payeeVpa}`,
    });

    return {
      paymentId,
      method: 'UPI_MANUAL',
      status: 'PENDING',
      amount: params.amount,
      currency: 'INR',
      upiDetails: {
        payeeVpa,
        payeeName,
        upiUri,
        qrPayload: upiUri,
        instructions: [
          'Open GPay, PhonePe, Paytm or BHIM on your smartphone.',
          `Scan the QR code or pay manually to UPI ID: ${payeeVpa}`,
          `Enter exact payable amount: ₹${params.amount}`,
          'After payment, copy the 12-digit UPI Reference Number (UTR / Ref ID).',
          'Paste the UTR number in the field below and click "I HAVE PAID".',
        ],
      },
      message: 'UPI payment initiated. Please complete transfer and submit UTR number.',
    };
  }

  async verifyPayment(paymentId: string, referenceData?: { utr: string; verifiedByAdmin?: boolean }): Promise<PaymentVerificationResult> {
    if (!referenceData?.utr || referenceData.utr.trim().length < 8) {
      return {
        verified: false,
        status: 'PENDING',
        message: 'Please enter a valid 12-digit UPI UTR transaction reference number.',
      };
    }

    if (referenceData.verifiedByAdmin) {
      return {
        verified: true,
        status: 'COMPLETED',
        transactionRef: referenceData.utr,
        verifiedAt: new Date().toISOString(),
        message: 'Payment confirmed and verified by admin against bank statement.',
      };
    }

    // Customer submitted UTR - enters review queue
    return {
      verified: false,
      status: 'UNDER_REVIEW',
      transactionRef: referenceData.utr,
      message: 'Payment UTR submitted. Order placed under review queue for verification.',
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Manual UPI refund of ₹${amount || 0} initiated. Customer notified to provide bank/VPA details.`,
    };
  }
}
