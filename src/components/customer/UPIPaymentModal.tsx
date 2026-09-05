import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { BRAND_CONFIG } from '../../config/brand';

interface UPIPaymentModalProps {
  order: any;
  paymentDetails: any;
  onClose: () => void;
  onPaymentSubmitted: (orderId: string, utr: string) => void;
}

export const UPIPaymentModal: React.FC<UPIPaymentModalProps> = ({
  order,
  paymentDetails,
  onClose,
  onPaymentSubmitted,
}) => {
  const [utrInput, setUtrInput] = useState('');
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(true);

  const payeeVpa = BRAND_CONFIG.upiId || '8235058525@sbi';
  const payeeName = BRAND_CONFIG.brandNameShort || 'Shoply';
  const amount = order?.totalAmount || 0;
  const orderNumber = order?.orderNumber || 'SHOPLY';

  // Standard NPCI UPI URI Specification:
  // upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
  const upiUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Order ' + orderNumber)}`;

  // Generate authentic scannable QR Code on mount/update
  useEffect(() => {
    let isMounted = true;
    setQrLoading(true);

    QRCode.toDataURL(upiUri, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrCodeDataUrl(url);
          setQrLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate UPI QR code:', err);
        if (isMounted) setQrLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [upiUri]);

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(payeeVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(String(amount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUtr = utrInput.trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 6) {
      setErrorMsg('Please enter the UPI Transaction Reference ID / UTR shown in your payment receipt.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitUtr(order.id, cleanUtr);
      onPaymentSubmitted(order.id, cleanUtr);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit UTR. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[95vh] flex flex-col border border-[#E8E8E5]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E8E5] bg-[#FAFAF8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#111111] flex items-center justify-center text-white font-bold shadow-xs">
              <QrCode className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <h2 className="font-bold text-[#111111] text-sm sm:text-base">
                Scan & Pay with UPI
              </h2>
              <p className="text-[11px] text-[#6B6B6B]">Order #{order?.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
            aria-label="Close UPI payment"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1 text-center">
          {/* Payable Amount Box */}
          <div className="bg-[#111111] text-white p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="text-left">
              <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Payable Amount</span>
              <p className="text-2xl font-black text-white">₹{amount}</p>
            </div>
            <button
              onClick={handleCopyAmount}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAmount ? 'Copied' : 'Copy ₹'}</span>
            </button>
          </div>

          {/* Authentic Real Scannable NPCI UPI QR Code */}
          <div className="p-4 bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl inline-block mx-auto w-full max-w-[280px]">
            <div className="w-52 h-52 sm:w-56 sm:h-56 bg-white p-2.5 rounded-2xl border border-[#E8E8E5] shadow-xs flex flex-col items-center justify-center relative mx-auto overflow-hidden">
              {qrLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-[#111111] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[11px] text-[#6B6B6B]">Generating UPI QR...</span>
                </div>
              ) : qrCodeDataUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={qrCodeDataUrl}
                    alt="Scan to pay with any UPI App"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  {/* Subtle NPCI UPI badge badge in the center */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/95 px-2 py-0.5 rounded-md border border-[#E8E8E5] shadow-2xs">
                      <span className="text-[9px] font-black text-[#FF5A36] tracking-wider">UPI</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-rose-600 p-2">Failed to load QR. Please use direct UPI ID below.</div>
              )}
            </div>

            <div className="mt-2.5 space-y-1">
              <p className="text-[11px] font-bold text-[#111111] flex items-center justify-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Scan with Google Pay, PhonePe, Paytm, or BHIM</span>
              </p>
              <p className="text-[10px] text-[#6B6B6B]">
                Amount ₹{amount} and payee will auto-fill on scan
              </p>
            </div>
          </div>

          {/* Mobile Direct Pay Deep Link (Opens UPI app directly on phones) */}
          <div className="sm:hidden">
            <a
              href={upiUri}
              className="w-full py-3 bg-[#FF5A36] hover:bg-[#E54C29] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open in UPI App (GPay / PhonePe / Paytm)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* VPA Copy Bar */}
          <div className="bg-[#FAFAF8] p-3 rounded-xl border border-[#E8E8E5] flex items-center justify-between gap-2 text-left">
            <div className="truncate">
              <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Direct UPI ID</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#111111] truncate select-all">{payeeVpa}</span>
            </div>
            <button
              onClick={handleCopyVpa}
              className="px-3 py-1.5 bg-white border border-[#E8E8E5] hover:bg-neutral-50 text-[#111111] rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedVpa ? 'Copied' : 'Copy ID'}</span>
            </button>
          </div>

          {/* Supported UPI Apps Pills */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-neutral-600 flex-wrap">
            <span className="px-2 py-0.5 bg-[#FAFAF8] rounded-md border border-[#E8E8E5]">Google Pay</span>
            <span className="px-2 py-0.5 bg-[#FAFAF8] rounded-md border border-[#E8E8E5]">PhonePe</span>
            <span className="px-2 py-0.5 bg-[#FAFAF8] rounded-md border border-[#E8E8E5]">Paytm</span>
            <span className="px-2 py-0.5 bg-[#FAFAF8] rounded-md border border-[#E8E8E5]">BHIM UPI</span>
            <span className="px-2 py-0.5 bg-[#FAFAF8] rounded-md border border-[#E8E8E5]">Cred</span>
          </div>

            {/* Step-by-Step Payment Instructions */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-left space-y-2 text-[11px] text-amber-900">
              <div className="font-bold flex items-center justify-between text-amber-950">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>How UPI Verification Works:</span>
                </span>
                <span className="text-[10px] font-mono bg-amber-200/60 px-1.5 py-0.5 rounded text-amber-900">
                  PAYMENT_REVIEW
                </span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-800">
                <li>Scan QR above or open your UPI app to pay ₹{amount}.</li>
                <li>Copy the Transaction / Reference ID / UTR from your bank or app receipt.</li>
                <li>Enter the reference below and submit. Your order moves to <strong>PAYMENT_REVIEW</strong> and is verified against bank statement.</li>
              </ol>
              <p className="text-[10px] text-amber-700/90 italic border-t border-amber-200/60 pt-1.5">
                Note: QR scan initiates payment. Order is confirmed once the transaction reference is verified.
              </p>
            </div>

            {/* UTR Form Submission */}
            <form onSubmit={handleSubmitUtr} className="pt-1 text-left space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  UPI Transaction Reference ID / UTR *
                </label>
                <input
                  type="text"
                  required
                  maxLength={35}
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value.replace(/[^a-zA-Z0-9\-_/]/g, ''))}
                  placeholder="e.g. 329847192834 or UPI Ref ID"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#111111] focus:bg-white focus:border-[#111111] outline-hidden uppercase tracking-wider"
                />
                <p className="text-[10px] text-[#6B6B6B] mt-1">
                  Found in your app receipt under "UPI Ref No.", "UTR", "Txn ID", or "Reference Number".
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || utrInput.trim().length < 6}
                className="w-full h-12 bg-[#FF5A36] hover:bg-[#E54C29] disabled:bg-neutral-300 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                {isSubmitting ? (
                  <span>Submitting Reference...</span>
                ) : (
                  <>
                    <span>SUBMIT PAYMENT REFERENCE</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};
