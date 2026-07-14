"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import CategoryBar from "./components/CategoryBar";
import MenuGrid from "./components/MenuGrid";
import OrderPanel from "./components/OrderPanel";
import menuData from "@/data/menu.json";

import { MenuItem, CartItem, SelectedOptions } from "./types";
import ProductModal from "./components/ProductModal";
import { calculateItemPrice } from "./utils/pricing";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  const generateCartItemId = (
    productId: number,
    variant?: string,
    options?: SelectedOptions
  ) => {
    let idStr = `${productId}`;
    if (variant) idStr += `-${variant}`;
    if (options) {
      const optionKeys = Object.keys(options).sort();
      for (const key of optionKeys) {
        idStr += `-${key}:${options[key]}`;
      }
    }
    return idStr;
  };

  const handleAddToCart = (item: MenuItem) => {
    if (
      (item.variants && item.variants.length > 0) ||
      (item.options && item.options.length > 0)
    ) {
      // Open modal for items with variations
      setSelectedProduct(item);
      setEditingCartItem(null);
    } else {
      // Add directly
      addOrUpdateCart(item, 1);
    }
  };

  const addOrUpdateCart = (
    item: MenuItem,
    quantity: number,
    variant?: string,
    options?: SelectedOptions
  ) => {
    const cartItemId = generateCartItemId(item.id, variant, options);
    const unitPrice = calculateItemPrice(item, variant, options);

    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === cartItemId);
      if (existing) {
        return prev.map((c) =>
          c.id === cartItemId ? { ...c, quantity: c.quantity + quantity } : c
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          productId: item.id,
          name: item.name,
          category: item.category,
          image: item.image,
          basePrice: item.price,
          price: unitPrice,
          quantity,
          variant,
          options,
        },
      ];
    });
  };

  const handleModalConfirm = (
    item: MenuItem,
    quantity: number,
    variant?: string,
    options?: SelectedOptions
  ) => {
    if (editingCartItem) {
      // If editing, we first remove the old item, then add the new one.
      // Or if the id is the same, just update quantity.
      const newCartItemId = generateCartItemId(item.id, variant, options);
      const unitPrice = calculateItemPrice(item, variant, options);

      setCartItems((prev) => {
        // If the configuration didn't change (ID is the same)
        if (newCartItemId === editingCartItem.id) {
          return prev.map((c) =>
            c.id === editingCartItem.id ? { ...c, quantity } : c
          );
        }

        // If the configuration changed, remove old, add new or merge with existing new
        const filtered = prev.filter((c) => c.id !== editingCartItem.id);
        const existingNew = filtered.find((c) => c.id === newCartItemId);
        
        if (existingNew) {
           return filtered.map((c) =>
             c.id === newCartItemId ? { ...c, quantity: c.quantity + quantity } : c
           );
        }

        return [
          ...filtered,
          {
            id: newCartItemId,
            productId: item.id,
            name: item.name,
            category: item.category,
            image: item.image,
            basePrice: item.price,
            price: unitPrice,
            quantity,
            variant,
            options,
          }
        ];
      });
    } else {
      addOrUpdateCart(item, quantity, variant, options);
    }
    setSelectedProduct(null);
    setEditingCartItem(null);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0);
    });
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEditItem = (cartItem: CartItem) => {
    const itemDef = menuData.menuItems.find((m) => m.id === cartItem.productId);
    if (itemDef) {
      setEditingCartItem(cartItem);
      setSelectedProduct(itemDef as MenuItem);
    }
  };

  const handleClearCart = () => setCartItems([]);

  return (
    <div className="pos-layout">
      <Sidebar />

      {/* Main Content */}
      <main className="pos-main">
        {/* Top Bar */}
        <header className="pos-topbar">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search menu..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="cashier-info">
            <div className="cashier-text">
              <span className="cashier-name">{menuData.cashier.name}</span>
              <span className="cashier-date">{menuData.cashier.date}</span>
            </div>
            <div className="cashier-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="pos-content-scroll">
          <CategoryBar activeCategory={activeCategory} onSelect={setActiveCategory} />
          <MenuGrid
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            onAdd={handleAddToCart}
          />
        </div>
      </main>

      {/* Right Order Panel */}
      <OrderPanel
        cartItems={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onEditItem={handleEditItem}
        onClearCart={handleClearCart}
      />

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          item={selectedProduct}
          existingCartItem={editingCartItem || undefined}
          onClose={() => {
            setSelectedProduct(null);
            setEditingCartItem(null);
          }}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
}
