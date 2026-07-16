"use client";

import Image from "next/image";

import { MenuItem } from "../types";

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

function MenuCard({ item, onAdd }: MenuCardProps) {
  // If trackStock is false, the item is made-to-order and never out of stock
  const isOutOfStock = item.trackStock ? item.available <= 0 : false;

  return (
    <div
      className={`menu-card ${isOutOfStock ? "out-of-stock" : ""}`}
      onClick={isOutOfStock ? undefined : () => onAdd(item)}
      role={isOutOfStock ? undefined : "button"}
      tabIndex={isOutOfStock ? -1 : 0}
      onKeyDown={isOutOfStock ? undefined : (e) => e.key === "Enter" && onAdd(item)}
    >
      {isOutOfStock && <span className="menu-card-sold-out-badge">Sold Out</span>}
      {!isOutOfStock && item.discount && (
        <span className="menu-card-badge">{item.discount}% Off</span>
      )}
      <div className="menu-card-image-wrap">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="menu-card-image"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
            <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="menu-card-info">
        <h3 className="menu-card-name">{item.name}</h3>
        <p className="menu-card-meta">
          {item.trackStock
            ? (isOutOfStock ? "Out of stock" : `${item.available} Available`)
            : "Made to order"} &bull; {item.sold} Sold
        </p>
        <div className="menu-card-price-row">
          {item.originalPrice && (
            <span className="menu-card-original">₱{item.originalPrice}</span>
          )}
          <span className="menu-card-price">₱{item.price}</span>
          <span className="menu-card-unit">/{item.unit}</span>
        </div>
      </div>
    </div>
  );
}

interface MenuGridProps {
  activeCategory: string;
  searchQuery: string;
  menuItems: MenuItem[];
  onAdd: (item: MenuItem) => void;
}

export default function MenuGrid({ activeCategory, searchQuery, menuItems, onAdd }: MenuGridProps) {
  const filtered = menuItems.filter((item) => {
    const matchCategory =
      activeCategory === "all" || item.category === activeCategory;
    const matchSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div>
      <div className="menu-section-header">
        <h2 className="section-title">Select Menu</h2>
      </div>
      <div className="menu-grid">
        {filtered.length === 0 ? (
          <div className="menu-empty">No items found.</div>
        ) : (
          filtered.map((item) => (
            <MenuCard key={item.id} item={item} onAdd={onAdd} />
          ))
        )}
      </div>
    </div>
  );
}
