import React, { useState, useEffect } from 'react';
import { Package, Truck, ChevronRight, ArrowRight } from 'lucide-react';
import { Order } from '../../types';
import { api } from '../../lib/api';
import { BRAND_CONFIG } from '../../config/brand';

interface CustomerOrdersListProps {
  onSelectOrder: (orderId: string) => void;
  onExploreProducts: () => void;
}

export const CustomerOrdersList: React.FC<CustomerOrdersListProps> = ({
  onSelectOrder,
  onExploreProducts,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOrders = async () => {
    try {
      const res = await api.getOrders();
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to fetch customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="w-8 h-8 border-3 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-[#6B6B6B]">Loading your order history...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#E8E8E5] flex items-center justify-center mx-auto mb-4 text-[#6B6B6B]">
          <Package className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#111111] mb-1">No Orders Yet</h3>
        <p className="text-xs text-[#6B6B6B] mb-5">
          You haven't placed any orders yet. Discover trending deals and everyday finds on {BRAND_CONFIG.brandNameShort}.
        </p>
        <button
          onClick={onExploreProducts}
          className="h-11 px-6 bg-[#111111] hover:bg-neutral-800 text-white font-bold rounded-xl shadow-xs transition-all text-xs cursor-pointer inline-flex items-center gap-2 active:scale-98"
        >
          <span>Start Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
        <div>
          <h2 className="text-xl font-bold text-[#111111]">Your Orders</h2>
          <p className="text-xs text-[#6B6B6B]">
            Track delivery progress, view invoices, and manage returns
          </p>
        </div>
        <button
          onClick={onExploreProducts}
          className="text-xs font-semibold text-[#FF5A36] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Shop More</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
          return (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className="bg-white rounded-2xl border border-[#E8E8E5] p-5 hover:border-neutral-400 transition-all cursor-pointer shadow-2xs hover:shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8E8E5]">
                <div>
                  <span className="text-[10px] text-[#6B6B6B] uppercase block">Order Number</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-[#111111]">
                    {order.orderNumber}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      order.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-800'
                        : order.status === 'SHIPPED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-[#FFF1EE] text-[#FF5A36]'
                    }`}
                  >
                    {order.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {order.items.slice(0, 3).map((it, idx) => (
                    <div
                      key={idx}
                      className="w-12 h-12 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] p-1 flex items-center justify-center shrink-0"
                    >
                      <img
                        src={it.productThumbnail}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <span className="text-xs text-[#6B6B6B] font-semibold">
                      +{order.items.length - 3} more
                    </span>
                  )}
                  <div className="ml-1">
                    <p className="text-xs font-semibold text-[#111111]">
                      {itemCount} item{itemCount > 1 ? 's' : ''}
                    </p>
                    <p className="text-[11px] text-[#6B6B6B]">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E8E5]">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-[#6B6B6B] block">Total Amount</span>
                    <span className="text-sm font-black text-[#111111]">₹{order.totalAmount}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOrder(order.id);
                    }}
                    className="h-9 px-4 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-98"
                  >
                    Track Status
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
