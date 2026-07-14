"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { Order, OrderItem } from "@prisma/client";
import ReceiptModal from "../components/ReceiptModal";
import { CartItem } from "../types";
import "./OrdersPage.css";

interface OrderWithItems extends Order {
  items: OrderItem[];
  storeName?: string;
  storeAddress?: string;
  storeTin?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;

    setCancellingId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "PATCH" });
      if (res.ok) {
        setOrders(orders.map((o) => (o.id === id ? { ...o, status: "cancelled", paymentStatus: "failed" } : o)));
        if (selectedOrder?.id === id) {
          setSelectedOrder({ ...selectedOrder, status: "cancelled", paymentStatus: "failed" });
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel order");
      }
    } catch {
      alert("Network error.");
    } finally {
      setCancellingId(null);
    }
  };

  const [cashierName, setCashierName] = useState("Cashier");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.cashierName) setCashierName(cfg.cashierName);
      })
      .catch(() => {});
  }, []);

  const cashierDate = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formatDate = (dateString: Date) =>
    new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateString));

  const formatPeso = (amount: number | string | any) =>
    `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statusClass = (status: string) => {
    if (status === "completed") return "status-badge status-completed";
    if (status === "pending") return "status-badge status-pending";
    if (status === "cancelled") return "status-badge status-cancelled";
    return "status-badge";
  };

  return (
    <div className="pos-layout">
      <Sidebar />
      <main className="pos-main" style={{ flex: 1, borderRight: "none" }}>
        <header className="pos-topbar">
          <h1 className="section-title" style={{ margin: 0 }}>Order History</h1>
          <div className="cashier-info">
            <div className="cashier-text">
              <span className="cashier-name">{cashierName}</span>
              <span className="cashier-date">{cashierDate}</span>
            </div>
            <div className="cashier-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
        </header>

        <div className="pos-content-scroll" style={{ padding: "24px" }}>
          {loading ? (
            <div className="menu-empty"><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
          ) : orders.length === 0 ? (
            <div className="menu-empty">No orders found.</div>
          ) : (
            <div className="orders-table-card">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} onClick={() => setSelectedOrder(order)}>
                      <td>
                        <span className="order-id-chip">{order.id.slice(-8).toUpperCase()}</span>
                      </td>
                      <td className="order-date">{formatDate(order.createdAt)}</td>
                      <td className="order-total">{formatPeso(order.total)}</td>
                      <td>
                        <span className="payment-chip">{order.paymentMethod}</span>
                      </td>
                      <td>
                        <span className={statusClass(order.status)}>{order.status}</span>
                      </td>
                      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="order-actions">
                          <button className="order-action-btn" onClick={() => setSelectedOrder(order)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                              <polyline points="6 9 6 2 18 2 18 9" />
                              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            View / Reprint
                          </button>
                          {order.status === "pending" && (
                            <button
                              className="order-action-btn order-action-danger"
                              onClick={(e) => handleCancel(order.id, e)}
                              disabled={cancellingId === order.id}
                            >
                              {cancellingId === order.id ? (
                                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              )}
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedOrder && (
        <ReceiptModal
          order={selectedOrder}
          cartItems={[]}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}