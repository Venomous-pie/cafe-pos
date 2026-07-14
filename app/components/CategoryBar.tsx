"use client";

import { JSX } from "react";

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  count: number;
}

const categoryIcons: Record<string, JSX.Element> = {
  all: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cat-icon">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  coffee: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cat-icon">
      <path d="M18 8h1a4 4 0 010 8h-1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  ),
  tea: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cat-icon">
      <path d="M17 8h1a4 4 0 010 8h-1" />
      <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
      <path d="M6 2c0 0 0 2 2 3" />
      <path d="M10 2c0 0 0 2 2 3" />
    </svg>
  ),
  mocktail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cat-icon">
      <path d="M8 22h8M12 11v11M3 3h18l-6 8H9L3 3z" />
    </svg>
  ),
  snacks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cat-icon">
      <circle cx="12" cy="12" r="10" />
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
    </svg>
  ),
  pastry: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cat-icon">
      <path d="M12 2a5 5 0 015 5H7a5 5 0 015-5z" />
      <path d="M5 7h14l1 13H4L5 7z" />
      <path d="M9 11v4M15 11v4" />
    </svg>
  ),
  sandwich: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cat-icon">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  ),
};

interface CategoryBarProps {
  activeCategory: string;
  categories: Category[];
  onSelect: (id: string) => void;
}

export default function CategoryBar({ activeCategory, categories, onSelect }: CategoryBarProps) {
  return (
    <div>
      <h2 className="section-title" style={{ marginBottom: "12px" }}>Categories</h2>
      <div className="category-bar">
        {/* "All Menu" virtual category */}
        <button
          onClick={() => onSelect("all")}
          className={`category-item ${activeCategory === "all" ? "active" : ""}`}
          aria-pressed={activeCategory === "all"}
        >
          <div className="category-icon-wrap">{categoryIcons["all"]}</div>
          <span className="category-name">All Menu</span>
          <span className="category-count">{categories.reduce((s, c) => s + c.count, 0)} item</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`category-item ${activeCategory === cat.id ? "active" : ""}`}
            aria-pressed={activeCategory === cat.id}
          >
            <div className="category-icon-wrap">
              {categoryIcons[cat.id] ?? categoryIcons["all"]}
            </div>
            <span className="category-name">{cat.name}</span>
            <span className="category-count">{cat.count} item</span>
          </button>
        ))}
      </div>
    </div>
  );
}

