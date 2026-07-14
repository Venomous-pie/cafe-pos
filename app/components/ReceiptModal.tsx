"use client";
import { useEffect, useRef, useState } from "react";
import { CartItem } from "../types";
import { Order, OrderItem } from "@prisma/client";
import "./ProductModal.css"; // Reuse existing modal CSS + receipt styles

interface OrderWithItems extends Order {
  items: OrderItem[];
  storeName?: string;
  storeAddress?: string;
  storeTin?: string;
}

interface ReceiptModalProps {
  order: OrderWithItems;
  cartItems: CartItem[]; // used as display-name fallback for options
  amountReceived?: number;
  onClose: () => void;
}

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReceiptModal({ order, cartItems, amountReceived, onClose }: ReceiptModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [reprinting, setReprinting] = useState(false);
  const [reprintMsg, setReprintMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => { modalRef.current?.focus(); }, []);

  const handleReprint = async () => {
    setReprinting(true);
    setReprintMsg(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/reprint`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setReprintMsg({ ok: true, text: "Receipt sent to printer." });
      } else {
        setReprintMsg({ ok: false, text: data?.error ?? "Reprint failed." });
      }
    } catch {
      setReprintMsg({ ok: false, text: "Network error — check connection." });
    } finally {
      setReprinting(false);
    }
  };

  // Use server-persisted OrderItems as the authoritative source for prices.
  // Fall back to cartItems only for option display names (not stored on OrderItem).
  const cartMap = new Map(cartItems.map((c) => [c.productId + (c.variant ?? ""), c]));

  const changeDue = amountReceived !== undefined ? amountReceived - Number(order.total) : null;

  const storeName = order.storeName ?? "Cafe POS";
  const storeAddress = order.storeAddress ?? "";
  const storeTin = order.storeTin ?? "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content receipt-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
        tabIndex={-1}
        ref={modalRef}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close receipt">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="receipt-paper">
          <div className="receipt-header">
            <h2 id="receipt-title">{storeName}</h2>
            {storeAddress && <p>{storeAddress}</p>}
            {storeTin && <p>VAT Reg TIN: {storeTin}</p>}
            <div className="receipt-divider" />
          </div>

          <div className="receipt-meta">
            <p><span>Order ID:</span> <span>{order.id.slice(-8).toUpperCase()}</span></p>
            <p><span>Date:</span> <span>{new Date(order.createdAt).toLocaleString()}</span></p>
            <p><span>Payment:</span> <span style={{ textTransform: "uppercase" }}>{order.paymentMethod}</span></p>
            <p><span>Status:</span> <span style={{ textTransform: "uppercase" }}>{order.paymentStatus}</span></p>
            <div className="receipt-divider" />
          </div>

          <div className="receipt-items">
            {order.items.map((item, index) => {
              // Try to find matching cart item for option display names
              const cartItem = cartMap.get(item.productId + (item.variantName ?? ""));
              const priceEach = Number(item.priceEach);
              const lineTotal = priceEach * item.quantity;

              return (
                <div key={`${item.id}-${index}`} className="receipt-item">
                  <div className="receipt-item-main">
                    <span className="receipt-qty">{item.quantity}x</span>
                    <span className="receipt-name">
                      {/* Product name not stored on OrderItem — use cartItem fallback or variant */}
                      {cartItem?.name ?? "Item"}{item.variantName ? ` (${item.variantName})` : ""}
                    </span>
                    <span className="receipt-price">{formatPeso(lineTotal)}</span>
                  </div>
                  {cartItem?.options && Object.entries(cartItem.options).length > 0 && (
                    <div className="receipt-item-options">
                      {Object.entries(cartItem.options).map(([k, v]) => (
                        <div key={k} className="receipt-option-line">+ {v}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="receipt-divider" />
          </div>

          <div className="receipt-totals">
            <div className="receipt-totals-line">
              <span>Subtotal</span>
              <span>{formatPeso(Number(order.subtotal))}</span>
            </div>
            <div className="receipt-totals-line">
              <span>Tax (8%)</span>
              <span>{formatPeso(Number(order.tax))}</span>
            </div>
            <div className="receipt-divider" />
            <div className="receipt-totals-line grand-total">
              <span>TOTAL</span>
              <span>{formatPeso(Number(order.total))}</span>
            </div>
            {amountReceived !== undefined && (
              <>
                <div className="receipt-totals-line">
                  <span>Cash Received</span>
                  <span>{formatPeso(amountReceived)}</span>
                </div>
                <div className="receipt-totals-line" style={{ fontWeight: 700 }}>
                  <span>Change</span>
                  <span>{formatPeso(changeDue ?? 0)}</span>
                </div>
              </>
            )}
            <div className="receipt-divider" />
          </div>

          <div className="receipt-footer">
            <p>THANK YOU FOR YOUR PURCHASE!</p>
            <p>Please come again.</p>
          </div>
        </div>

        {reprintMsg && (
          <div className={`receipt-reprint-msg ${reprintMsg.ok ? "ok" : "err"}`}>
            {reprintMsg.text}
          </div>
        )}

        <div className="receipt-actions">
          <button
            className="secondary-btn"
            onClick={handleReprint}
            disabled={reprinting}
            aria-busy={reprinting}
          >
            {reprinting ? (
              <><span className="spinner" aria-hidden="true" /> Printing…</>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Receipt
              </>
            )}
          </button>
          <button className="primary-btn" onClick={onClose} style={{ flex: 1 }}>
            Done / New Order
          </button>
        </div>
      </div>
    </div>
  );
}
