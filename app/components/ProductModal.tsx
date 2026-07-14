"use client";
import "./ProductModal.css";

import Image from "next/image";
import { useState } from "react";
import { MenuItem, SelectedOptions, CartItem } from "../types";
import { calculateItemPrice } from "../utils/pricing";

interface ProductModalProps {
  item: MenuItem;
  existingCartItem?: CartItem;
  onClose: () => void;
  onConfirm: (
    item: MenuItem,
    quantity: number,
    variant?: string,
    options?: SelectedOptions
  ) => void;
}

export default function ProductModal({
  item,
  existingCartItem,
  onClose,
  onConfirm,
}: ProductModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(
    existingCartItem?.variant || item.variants?.[0]?.name
  );
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(
    existingCartItem?.options || {}
  );
  const [quantity, setQuantity] = useState(existingCartItem?.quantity || 1);

  const pricePerUnit = calculateItemPrice(item, selectedVariant, selectedOptions);
  const totalPrice = pricePerUnit * quantity;

  // Validation
  const isValid = () => {
    if (item.options) {
      for (const opt of item.options) {
        if (opt.required && !selectedOptions[opt.name]) {
          return false;
        }
      }
    }
    if (item.variants && !selectedVariant) {
      return false;
    }
    return true;
  };

  const handleOptionChange = (optionName: string, choiceName: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: choiceName,
    }));
  };

  const handleConfirm = () => {
    if (isValid()) {
      onConfirm(item, quantity, selectedVariant, selectedOptions);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="modal-header">
          {item.image && (
            <div className="modal-image-wrap">
              <Image
                src={item.image}
                alt={item.name}
                fill
                style={{ objectFit: "cover" }}
                sizes="80px"
              />
            </div>
          )}
          <div className="modal-title-group">
            <h2 className="modal-title">{item.name}</h2>
            <p className="modal-base-price">Base: ₱{item.price}</p>
          </div>
        </div>

        <div className="modal-body scrollable">
          {/* Variants */}
          {item.variants && item.variants.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">Variant <span className="required-star">*</span></h3>
              <div className="modal-options-grid">
                {item.variants.map((v) => (
                  <label
                    key={v.name}
                    className={`modal-option-card ${selectedVariant === v.name ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="variant"
                      value={v.name}
                      checked={selectedVariant === v.name}
                      onChange={() => setSelectedVariant(v.name)}
                      className="hidden-radio"
                    />
                    <span className="option-name">{v.name}</span>
                    <span className="option-price">₱{v.price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          {item.options &&
            item.options.map((opt) => (
              <div key={opt.name} className="modal-section">
                <h3 className="modal-section-title">
                  {opt.name} {opt.required && <span className="required-star">*</span>}
                </h3>
                <div className="modal-options-grid">
                  {opt.choices.map((choice) => {
                    const isSelected = selectedOptions[opt.name] === choice.name;
                    return (
                      <label
                        key={choice.name}
                        className={`modal-option-card ${isSelected ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`option-${opt.name}`}
                          value={choice.name}
                          checked={isSelected}
                          onChange={() => handleOptionChange(opt.name, choice.name)}
                          className="hidden-radio"
                        />
                        <span className="option-name">{choice.name}</span>
                        {choice.additionalPrice ? (
                          <span className="option-price">+₱{choice.additionalPrice}</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Quantity Stepper */}
          <div className="modal-section quantity-section">
            <h3 className="modal-section-title">Quantity</h3>
            <div className="stepper-controls">
              <button
                className="stepper-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="stepper-value">{quantity}</span>
              <button
                className="stepper-btn"
                onClick={() => setQuantity(quantity + 1)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className={`modal-confirm-btn ${!isValid() ? "disabled" : ""}`}
            onClick={handleConfirm}
            disabled={!isValid()}
          >
            <span>{existingCartItem ? "Update Order" : "Add to Order"}</span>
            <span className="modal-total">₱{totalPrice.toLocaleString()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
