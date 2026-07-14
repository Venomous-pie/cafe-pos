"use client";

import Image from "next/image";

import { MenuItem } from "../types";

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

function MenuCard({ item, onAdd }: MenuCardProps) {
  const isOutOfStock = item.available <= 0;

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
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="menu-card-image"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>
      <div className="menu-card-info">
        <h3 className="menu-card-name">{item.name}</h3>
        <p className="menu-card-meta">
          {isOutOfStock ? "Out of stock" : `${item.available} Available`} &bull; {item.sold} Sold
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
