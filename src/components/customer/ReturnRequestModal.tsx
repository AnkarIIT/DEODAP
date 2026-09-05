import React, { useState } from 'react';
import { X, RotateCcw, AlertCircle, ArrowRight, UploadCloud, CheckCircle2 } from 'lucide-react';
import { Order } from '../../types';
import { api } from '../../lib/api';

interface ReturnRequestModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

const RETURN_REASONS = [
  'Damaged / broken product received',
  'Wrong item or incorrect color/model delivered',
  'Defective / does not turn on or work',
  'Item quality not as described in catalog',
  'Missing accessories or parts from package',
];

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  if (!order) return null;

  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!description.trim()) {
      setErrorMsg('Please provide a brief explanation of the problem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createReturn({
        orderId: order.id,
        reason,
        description,
        images: imageUrl ? [imageUrl] : [],
      });
      alert('Return request submitted successfully. Our operations team will review it within 24 hours.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit return request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-8 p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-black text-slate-900 text-base font-display">Request Return / Replacement</h2>
              <p className="text-[11px] text-slate-500">Order #{order.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="pt-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Reason for Return *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden font-medium"
            >
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Describe the Issue in Detail *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe why you are requesting a return/exchange..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Photo / Image URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/damaged-item-photo.jpg"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Photos expedite supplier RMA approval and pickup courier assignment.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-2xl text-[11px] text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" /> 7-Day Replacement Policy
            </p>
            <p>Our courier agent will pick up the package from your doorstep with zero pickup charges.</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <span>{isSubmitting ? 'Submitting Request...' : 'Submit Return Request'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
