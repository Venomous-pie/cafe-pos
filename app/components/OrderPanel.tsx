"use client";
import "./ProductModal.css";

import Image from "next/image";
import { JSX, useState } from "react";

import { CartItem } from "../types";
import { Order } from "@prisma/client";
import ReceiptModal from "./ReceiptModal";

// ─── Constants ─────────────────────────────────────────────────────────────
// Tax rate is a display-only estimate; the server always recalculates the
// authoritative total. Keep in sync with lib/pricing.ts TAX_RATE.
const TAX_RATE = 0.08;

const PAYMENT_METHODS = [
  { id: "cash", name: "Cash" },
  { id: "qr", name: "GCash" },
  { id: "maya", name: "Maya" },
  { id: "maribank", name: "Maribank" },
] as const;

type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

// ─── Payment Icons ──────────────────────────────────────────────────────────
const FallbackIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pay-icon">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const PaymentIcons: Record<string, JSX.Element> = {
  cash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pay-icon">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  qr: (
    <div className="pay-icon-img-wrap">
      <Image src="/payment_platform/gcash.jpeg" alt="GCash" fill style={{ objectFit: "cover" }} sizes="24px" />
    </div>
  ),
  maya: (
    <div className="pay-icon-img-wrap">
      <Image src="/payment_platform/maya.jpeg" alt="Maya" fill style={{ objectFit: "cover" }} sizes="24px" />
    </div>
  ),
  maribank: (
    <div className="pay-icon-img-wrap">
      <Image src="/payment_platform/maribank.jpeg" alt="Maribank" fill style={{ objectFit: "cover" }} sizes="24px" />
    </div>
  ),
};

function getPaymentIcon(id: string): JSX.Element {
  return PaymentIcons[id] ?? FallbackIcon;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
/** Derive configurability from the cart item itself — no menu lookup needed. */
const isConfigurable = (item: CartItem) =>
  Boolean(item.variant || (item.options && Object.keys(item.options).length > 0));

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Types ──────────────────────────────────────────────────────────────────
interface OrderPanelProps {
  cartItems: CartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onEditItem: (item: CartItem) => void;
  onClearCart: () => void;
}

type OrderError = { message: string; retryable: boolean };

// ─── Component ──────────────────────────────────────────────────────────────
export default function OrderPanel({
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onEditItem,
  onClearCart,
}: OrderPanelProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodId>("cash");
  const [processing, setProcessing] = useState(false);
  const [orderError, setOrderError] = useState<OrderError | null>(null);
  const [hardwareWarning, setHardwareWarning] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Display-only estimates — server recalculates authoritatively on submit.
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = subtotal * TAX_RATE;
  const total = subtotal + taxAmount;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCancelOrder = () => {
    if (!window.confirm("Cancel the entire order? All items will be removed.")) return;
    onClearCart();
  };

  const handleProcess = async () => {
    if (cartItems.length === 0) return;

    setProcessing(true);
    setOrderError(null);
    setHardwareWarning(null);

    try {
      const body = {
        paymentMethod: selectedPayment,
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantName: item.variant ?? null,
          selectedOptions: item.options ?? {},
          quantity: item.quantity,
          // Client price is a hint only — server ignores it and recalculates.
          clientPriceHint: item.price,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data?.error ?? `Server error (${res.status}). Please try again.`;
        setOrderError({ message, retryable: res.status >= 500 });
        return;
      }

      const order = await res.json();

      if (order.hardwareWarning) {
        setHardwareWarning(order.hardwareWarning);
      }

      setCompletedOrder(order);
    } catch {
      setOrderError({
        message: "Network error — check your connection and try again.",
        retryable: true,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <aside className="order-panel">
      <div className="order-panel-inner">
        {/* Header */}
        <div className="order-header">
          <h2 className="order-title">Order Details</h2>
          {cartItems.length > 0 && (
            <button className="clear-btn cancel-order-btn" onClick={handleCancelOrder}>
              Cancel Order
            </button>
          )}
        </div>

        {/* Hardware warning banner */}
        {hardwareWarning && (
          <div className="order-hardware-warning" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{hardwareWarning}</span>
            <button
              className="order-warning-dismiss"
              onClick={() => setHardwareWarning(null)}
              aria-label="Dismiss hardware warning"
            >
              ×
            </button>
          </div>
        )}

        {/* Error banner */}
        {orderError && (
          <div className="order-error-banner" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{orderError.message}</span>
            {orderError.retryable && (
              <button className="order-error-retry" onClick={handleProcess} aria-label="Retry transaction">
                Retry
              </button>
            )}
            <button
              className="order-warning-dismiss"
              onClick={() => setOrderError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Cart Items */}
        <div className="cart-items-list">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="cart-empty-icon" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <p>No items added yet</p>
              <span>Click on a menu item to add</span>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-image-wrap cart-item-clickable" onClick={() => onEditItem(item)}>
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="cart-item-image"
                    sizes="56px"
                  />
                </div>
                <div className="cart-item-info">
                  <p className="cart-item-name cart-item-clickable" onClick={() => onEditItem(item)}>
                    {item.name}
                  </p>
                  <div className="cart-item-meta cart-item-clickable" onClick={() => onEditItem(item)}>
                    {item.variant && <span className="cart-variant">{item.variant}</span>}
                    {item.options &&
                      Object.entries(item.options).map(([k, v]) => (
                        <span key={k} className="cart-option">{v}</span>
                      ))}
                  </div>
                  <div className="cart-item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => onUpdateQty(item.id, -1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn add"
                      onClick={() => onUpdateQty(item.id, 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <div className="cart-item-btn-group">
                    {isConfigurable(item) && (
                      <button
                        className="remove-item-btn edit-item-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(item);
                        }}
                        aria-label={`Edit ${item.name} options`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    )}
                    <button
                      className="remove-item-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.id);
                      }}
                      aria-label={`Remove ${item.name} from order`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="cart-item-price">
                    {formatPeso(item.price * item.quantity)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary — display-only estimates */}
        <div className="order-summary">
          <div className="summary-row">
            <span>Item{totalItems !== 1 ? "s" : ""}</span>
            <span>{totalItems} {totalItems !== 1 ? "items" : "item"}</span>
          </div>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPeso(subtotal)}</span>
          </div>
          <div className="summary-row tax">
            <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
            <span>{formatPeso(taxAmount)}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPeso(total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="payment-section">
          <h3 className="payment-title">Payment Method</h3>
          <div className="payment-methods">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedPayment(method.id)}
                className={`payment-method-btn ${selectedPayment === method.id ? "active" : ""}`}
                aria-label={`Pay with ${method.name}`}
                aria-pressed={selectedPayment === method.id}
              >
                {getPaymentIcon(method.id)}
                <span>{method.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Process Button */}
        <button
          className={`process-btn ${processing ? "processing" : ""} ${cartItems.length === 0 ? "disabled" : ""}`}
          onClick={handleProcess}
          disabled={cartItems.length === 0 || processing}
          aria-busy={processing}
          aria-label="Process transaction"
        >
          {processing ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Processing...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              Process Transaction
            </>
          )}
        </button>
      </div>

      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          cartItems={cartItems}
          onClose={() => {
            setCompletedOrder(null);
            onClearCart();
          }}
        />
      )}
    </aside>
  );
}
