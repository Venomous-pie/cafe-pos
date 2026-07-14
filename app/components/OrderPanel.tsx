"use client";
import "./ProductModal.css";

import Image from "next/image";
import { JSX, useState } from "react";
import menuData from "@/data/menu.json";

import { CartItem } from "../types";

interface OrderPanelProps {
  cartItems: CartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onEditItem: (item: CartItem) => void;
  onClearCart: () => void;
}

const PaymentIcons: Record<string, JSX.Element> = {
  cash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pay-icon">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pay-icon">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pay-icon">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  ),
  maya: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pay-icon">
      <path d="M20 12V22H4V12" />
      <path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  ),
};

export default function OrderPanel({ cartItems, onUpdateQty, onRemoveItem, onEditItem, onClearCart }: OrderPanelProps) {
  const [selectedPayment, setSelectedPayment] = useState("cash");
  const [processing, setProcessing] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = subtotal * menuData.taxRate;
  const total = subtotal + taxAmount;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleProcess = () => {
    if (cartItems.length === 0) return;
    setProcessing(true);
    setTimeout(() => {
      onClearCart();
      setProcessing(false);
    }, 1500);
  };

  return (
    <aside className="order-panel">
      <div className="order-panel-inner">
        {/* Header */}
        <div className="order-header">
          <h2 className="order-title">Order Details</h2>
          {cartItems.length > 0 && (
            <button className="clear-btn cancel-order-btn" onClick={onClearCart}>
              Cancel Order
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="cart-items-list">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="cart-empty-icon">
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
                <div className="cart-item-image-wrap" onClick={() => onEditItem(item)} style={{ cursor: 'pointer' }}>
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="cart-item-image"
                    sizes="56px"
                  />
                </div>
                <div className="cart-item-info">
                  <p className="cart-item-name" onClick={() => onEditItem(item)} style={{ cursor: 'pointer' }}>
                    {item.name}
                  </p>
                  <div className="cart-item-meta" onClick={() => onEditItem(item)} style={{ cursor: 'pointer' }}>
                    {item.variant && <span className="cart-variant">{item.variant}</span>}
                    {item.options && Object.entries(item.options).map(([k, v]) => (
                      <span key={k} className="cart-option">{v}</span>
                    ))}
                  </div>
                  <div className="cart-item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => onUpdateQty(item.id, -1)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn add"
                      onClick={() => onUpdateQty(item.id, 1)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <button className="remove-item-btn" onClick={() => onRemoveItem(item.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <div className="cart-item-price">
                    ₱{(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="order-summary">
          <div className="summary-row">
            <span>Item{totalItems !== 1 ? "s" : ""}</span>
            <span>{totalItems} {totalItems !== 1 ? "items" : "item"}</span>
          </div>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>₱{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="summary-row tax">
            <span>Tax ({(menuData.taxRate * 100).toFixed(0)}%)</span>
            <span>₱{taxAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-row total">
            <span>Total</span>
            <span>₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="payment-section">
          <h3 className="payment-title">Payment Method</h3>
          <div className="payment-methods">
            {menuData.paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedPayment(method.id)}
                className={`payment-method-btn ${selectedPayment === method.id ? "active" : ""}`}
              >
                {PaymentIcons[method.id]}
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
        >
          {processing ? (
            <>
              <span className="spinner" />
              Processing...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              Process Transaction
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
