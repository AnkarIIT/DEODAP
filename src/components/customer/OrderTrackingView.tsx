import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  XCircle,
  IndianRupee,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { api } from '../../lib/api';

interface OrderTrackingViewProps {
  orderId: string;
  onBack: () => void;
  onRequestReturn: (order: Order) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  orderId,
  onBack,
  onRequestReturn,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelMessage, setCancelMessage] = useState<string>('');

  const fetchOrderDetails = async () => {
    try {
      const res = await api.getOrder(orderId);
      setOrder(res.order);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    setCancelling(true);
    try {
      await api.cancelOrder(order.id);
      setCancelMessage('Order has been cancelled successfully.');
      fetchOrderDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="w-8 h-8 border-3 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xs text-[#6B6B6B]">Fetching order tracking information...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-[#6B6B6B] mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#111111] mb-2">Order Not Found</h3>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-[#111111] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-neutral-800"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  // Customer-facing milestones stepper:
  const STEPS: Array<{ key: string; label: string; statuses: OrderStatus[] }> = [
    { key: 'placed', label: 'Order Placed', statuses: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'CONFIRMED', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING', 'SUPPLIER_ORDERED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { key: 'verified', label: 'Payment Verified', statuses: ['PAID', 'CONFIRMED', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING', 'SUPPLIER_ORDERED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { key: 'processing', label: 'Dispatched Hub', statuses: ['SUPPLIER_ORDERED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { key: 'shipped', label: 'In Transit', statuses: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { key: 'delivered', label: 'Delivered', statuses: ['DELIVERED'] },
  ];

  const currentStepIndex = STEPS.findIndex((s) => s.statuses.includes(order.status));
  const isCancelled = order.status === 'CANCELLED';
  const isReturnRequested = ['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'REFUNDED'].includes(order.status);
  const isCancellable = ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'CONFIRMED', 'SUPPLIER_SELECTION'].includes(order.status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      {/* Top back nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] bg-white border border-[#E8E8E5] px-4 py-2 rounded-xl shadow-2xs hover:bg-[#FAFAF8] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Orders</span>
        </button>

        <span className="text-xs font-mono font-bold text-[#6B6B6B]">
          Order ID: <strong className="text-[#111111]">{order.orderNumber}</strong>
        </span>
      </div>

      {cancelMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
          {cancelMessage}
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#E8E8E5]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-[#111111] tracking-tight">
                Order #{order.orderNumber}
              </h1>
              <span
                className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  order.status === 'DELIVERED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : order.status === 'CANCELLED'
                    ? 'bg-red-50 text-red-700 border border-red-200/60'
                    : 'bg-[#FFF1EE] text-[#FF5A36] border border-[#FFD9D0]'
                }`}
              >
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B]">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Payment: {order.paymentMethod.replace(/_/g, ' ')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isCancellable && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-all cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}

            {order.status === 'DELIVERED' && !isReturnRequested && (
              <button
                onClick={() => onRequestReturn(order)}
                className="px-4 py-2 bg-[#111111] hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Request Return / Exchange</span>
              </button>
            )}
          </div>
        </div>

        {/* Milestone Stepper */}
        {!isCancelled ? (
          <div className="py-6 border-b border-[#E8E8E5]">
            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-5">
              Live Fulfillment Status
            </h3>
            <div className="relative flex items-center justify-between">
              {/* Connector line */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#E8E8E5] w-full z-0"></div>
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#111111] transition-all duration-700 z-0"
                style={{ width: `${Math.max(0, (currentStepIndex / (STEPS.length - 1)) * 100)}%` }}
              ></div>

              {STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isPassed
                          ? 'bg-[#111111] text-white'
                          : 'bg-white border-2 border-[#E8E8E5] text-neutral-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-semibold mt-2 text-center max-w-[70px] leading-tight ${
                        isCurrent ? 'text-[#111111] font-bold' : isPassed ? 'text-neutral-800' : 'text-neutral-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-6 border-b border-[#E8E8E5] bg-red-50/60 p-4 rounded-2xl my-4 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-red-900">This Order Has Been Cancelled</h4>
            <p className="text-xs text-red-700">Any payments made will be refunded to the original account within 24-48 hours.</p>
          </div>
        )}

        {/* Courier Shipment Tracking Card (if manifested/shipped) */}
        {order.shipments && order.shipments.length > 0 && (
          <div className="py-5 border-b border-[#E8E8E5]">
            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#FF5A36]" />
              Courier Shipment Details
            </h3>
            {order.shipments.map((shp) => (
              <div
                key={shp.id}
                className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-[#111111] text-sm">{shp.carrier}</p>
                  <p className="text-[#6B6B6B] mt-0.5">
                    AWB Tracking Number: <strong className="font-mono text-[#111111]">{shp.trackingNumber}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Status: {shp.currentStatus}
                  </p>
                </div>
                {shp.trackingUrl && (
                  <a
                    href={shp.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl font-bold flex items-center gap-1 transition-all"
                  >
                    <span>Courier Tracking Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Items List */}
        <div className="py-5 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            Items in this Order ({order.items.length})
          </h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.productThumbnail}
                    alt={item.productTitle}
                    className="w-14 h-14 rounded-xl object-cover bg-white"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 line-clamp-1">{item.productTitle}</h4>
                    <p className="text-gray-500 text-[11px]">
                      Qty: <strong>{item.quantity}</strong> × ₹{item.unitPrice}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-gray-900 text-sm">₹{item.totalPrice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Address & Pricing Grid */}
        <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <h4 className="font-bold text-gray-900 mb-2 uppercase tracking-wider text-[11px]">
              Delivery Destination
            </h4>
            <div className="text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-200 leading-relaxed">
              <p className="font-bold text-gray-900">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </p>
              <p className="mt-1 text-gray-700 font-medium">Contact: {order.shippingAddress.phone}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2 uppercase tracking-wider text-[11px]">
              Payment Breakdown
            </h4>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping Fee</span>
                <span>{order.shippingFee === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${order.shippingFee}`}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Amount</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Status Change Logs Timeline */}
        {order.statusLogs && order.statusLogs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Activity & Tracking History
            </h4>
            <div className="space-y-2.5">
              {order.statusLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {log.toStatus.replace(/_/g, ' ')}
                      {log.note && <span className="text-gray-500 font-normal ml-1.5">({log.note})</span>}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(log.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
