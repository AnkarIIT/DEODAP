import { PaymentMethod, PaymentStatus } from '../types';

export interface CreatePaymentParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName: string;
  customerPhone?: string;
  method: PaymentMethod;
}

export interface PaymentInitializationResult {
  paymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  upiDetails?: {
    payeeVpa: string;
    payeeName: string;
    upiUri: string;
    qrPayload: string;
    instructions: string[];
  };
  clientSecret?: string;
  message: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: PaymentStatus;
  transactionRef?: string;
  message: string;
  verifiedAt?: string;
}

export interface PaymentProvider {
  providerName: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentInitializationResult>;
  verifyPayment(paymentId: string, referenceData?: any): Promise<PaymentVerificationResult>;
  refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; message: string }>;
}
