"use client";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import "./QRPaymentModal.css";

interface QRPaymentModalProps {
  method: "gcash" | "maya" | "maribank";
  methodName: string;
  amount: number;
  onConfirm: () => void; // mock: simulates customer completing payment
  onCancel: () => void;
}

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const logos: Record<string, string> = {
  gcash: "/payment_platform/gcash.jpeg",
  maya: "/payment_platform/maya.jpeg",
  maribank: "/payment_platform/maribank.jpeg",
};

export default function QRPaymentModal({
  method,
  methodName,
  amount,
  onConfirm,
  onCancel,
}: QRPaymentModalProps) {
  // Mock payload — not a real payment standard, just enough to be a valid QR for testing.
  // Real integration later replaces this string with whatever payload the gateway SDK returns.
  const qrPayload = JSON.stringify({
    method,
    amount: amount.toFixed(2),
    ref: `MOCK-${Date.now()}`,
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content qr-payment-modal">
        <div className="qr-modal-header">
          <div className="pay-icon-img-wrap" style={{ width: 32, height: 32 }}>
            <Image src={logos[method]} alt={methodName} fill style={{ objectFit: "cover" }} sizes="32px" />
          </div>
          <h2>Scan with {methodName}</h2>
        </div>

        {/* Amount shown big and separate from the QR itself — customers read this,
            they don't decode the QR payload to check the amount. */}
        <div className="qr-amount-display">
          <span className="qr-amount-label">Amount to pay</span>
          <span className="qr-amount-value">{formatPeso(amount)}</span>
        </div>

        <div className="qr-code-wrap">
          <QRCodeSVG value={qrPayload} size={220} level="M" />
        </div>

        <p className="qr-modal-hint">Waiting for payment confirmation…</p>

        {/* Mock-only controls — remove once real gateway webhook/polling replaces this */}
        <div className="qr-modal-actions">
          <button className="qr-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="qr-modal-simulate" onClick={onConfirm}>
            Received(Simulate)
          </button>
        </div>
      </div>
    </div>
  );
}