"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import CategoryBar from "./components/CategoryBar";
import MenuGrid from "./components/MenuGrid";
import OrderPanel from "./components/OrderPanel";
import menuData from "@/data/menu.json";

interface CartItem {
  id: number;
  name: string;
  category: string;
  image: string;
  price: number;
  quantity: number;
}

interface MenuItem {
  id: number;
  name: string;
  category: string;
  image: string;
  price: number;
  originalPrice: number | null;
  available: number;
  sold: number;
  discount: number | null;
  unit: string;
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          category: item.category,
          image: item.image,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQty = (id: number, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0);
    });
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
        onClearCart={handleClearCart}
      />
    </div>
  );
}
