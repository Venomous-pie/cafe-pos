import { useEffect, useRef } from "react";
import { CartItem } from "../types";
import { Order } from "@prisma/client";
import "./ProductModal.css"; // Reuse existing modal CSS + new receipt styles

interface ReceiptModalProps {
  order: Order;
  cartItems: CartItem[];
  onClose: () => void;
}

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReceiptModal({ order, cartItems, onClose }: ReceiptModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Trap focus (basic)
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

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
            <h2>CAFE POS</h2>
            <p>123 Coffee Lane, Brew City</p>
            <p>VAT Reg TIN: 123-456-789-000</p>
            <div className="receipt-divider"></div>
          </div>

          <div className="receipt-meta">
            <p><span>Order ID:</span> <span>{order.id.slice(-8).toUpperCase()}</span></p>
            <p><span>Date:</span> <span>{new Date(order.createdAt).toLocaleString()}</span></p>
            <p><span>Payment:</span> <span style={{ textTransform: "uppercase" }}>{order.paymentMethod}</span></p>
            <p><span>Status:</span> <span style={{ textTransform: "uppercase" }}>{order.paymentStatus}</span></p>
            <div className="receipt-divider"></div>
          </div>

          <div className="receipt-items">
            {cartItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="receipt-item">
                <div className="receipt-item-main">
                  <span className="receipt-qty">{item.quantity}x</span>
                  <span className="receipt-name">
                    {item.name} {item.variant && `(${item.variant})`}
                  </span>
                  <span className="receipt-price">{formatPeso(item.price * item.quantity)}</span>
                </div>
                {item.options && Object.entries(item.options).length > 0 && (
                  <div className="receipt-item-options">
                    {Object.entries(item.options).map(([k, v]) => (
                      <div key={k} className="receipt-option-line">
                        + {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="receipt-divider"></div>
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
            <div className="receipt-divider"></div>
            <div className="receipt-totals-line grand-total">
              <span>TOTAL</span>
              <span>{formatPeso(Number(order.total))}</span>
            </div>
            <div className="receipt-divider"></div>
          </div>

          <div className="receipt-footer">
            <p>THANK YOU FOR YOUR PURCHASE!</p>
            <p>Please come again.</p>
          </div>
        </div>

        <div className="receipt-actions">
          <button className="primary-btn" onClick={onClose} style={{ width: "100%" }}>
            Done / New Order
          </button>
        </div>
      </div>
    </div>
  );
}
