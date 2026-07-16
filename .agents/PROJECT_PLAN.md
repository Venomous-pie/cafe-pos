# Cafe POS System — Project Plan

## 1. Product Overview

- A point-of-sale (POS) system built for cafes that serve **food and drinks**.
- Goal: as **flexible** as possible, so it can fit many different cafes menus and workflows — not built for one specific cafe.
- Sold as **the same software to each cafe**, but each installation runs on its **own independent database** — not a shared multi-tenant system.
- Runs **fully offline**, locally on the cafe's own machine — no cloud/shared server dependency.

## 2. Go-to-Market

- Target market: cafes in **Davao City**.
- Sales/onboarding model: **door-to-door** — you personally visit each cafe and set up the system for them.
- Implication: **you are the primary user of the setup tooling** (like the import wizard) early on, not just the cafe owner.

## 3. Deployment Model

| Aspect | Decision |
|---|---|
| Hosting | Fully local, on the cafe's own machine |
| Networking | Fully offline — no internet dependency required |
| Setup | In-person, hands-on (by you) |
| Database | One independent DB per cafe (no shared/multi-tenant DB) |

### Recommended packaging
- **Desktop app** (Tauri or Electron) wrapping the frontend + local backend logic.
- **Tauri** preferred over Electron for smaller install size and lower memory use.

### Recommended database
- **SQLite** — no separate DB server, single-file, easy backup, Prisma-supported.

## 4. Key Operational Risks & Mitigations

### Data loss
- Scheduled local backups (nightly copy of the SQLite file, keep last N)
- Manual "export to USB" option
- Optional opt-in cloud backup later (backup only, not live sync)

### Software updates
- v1: manual update during a visit or remote-in session
- Better: in-app version check + auto-apply migrations on launch
- Keep migrations backward-compatible — a bad migration on an unbacked-up machine is unrecoverable

## 5. Flexible Product Data Model

Approach: rigid core columns + a JSON "custom fields" bucket, rather than full EAV.

Current schema (as of 2026-07-16):

```prisma
model Product {
  id            String   @id @default(cuid())
  name          String
  sku           String?  @unique           // dedup key for import wizard
  basePrice     Decimal?                   // price when no variants apply; null = variant-only
  description   String?
  imageUrl      String?
  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id])
  isAvailable   Boolean  @default(true)   // runtime toggle (e.g. sold out today)
  isActive      Boolean  @default(true)   // permanent flag (e.g. removed from menu)
  trackStock    Boolean  @default(false)  // opt-in per-product stock tracking
  available     Int      @default(0)
  sold          Int      @default(0)
  unit          String   @default("Piece")
  importBatchId String?                   // set during CSV import; used for rollback
  customFields  String?                   // JSON blob (SQLite does not support native Json type)
  variants      Variant[]
  optionGroups  OptionGroup[]
  promotions    Promotion[]
  orderItems    OrderItem[]
}
```

- Categories, units, variant/modifier structures should be configurable per cafe.
- v1: **flat product import only** (no variants/modifiers via the wizard) — variant import is v2.

## 6. Product Column-Mapping Import Wizard

### Flow
1. Upload file (CSV/XLSX)
2. Parse headers + preview rows
3. Auto-suggest column-to-field mappings
4. User confirms/adjusts mappings
5. Live preview of mapped data before commit
6. Validate (types, required fields, duplicate SKUs) — show per-row errors, do not fail the whole batch
7. Commit import (batched, tagged with importBatchId for rollback)
8. Optionally save the mapping as a reusable template

### System components
```
Upload UI -> Parser Service -> Mapping Engine -> Preview UI
                                                      |
                                             Validation Engine
                                                      |
                                             Import Executor
                                                      |
                                        Mapping Template Store
```

### Libraries
- **Parser**: papaparse (CSV), xlsx/SheetJS (Excel)
- **Mapping engine**: alias table per field + fuzzy string matching (Jaro-Winkler, ~0.75 threshold)
- **Saved templates**: keyed by normalized fingerprint of the header set

### UX note
Optimize for your fast, repeated use (saved templates, keyboard-driven mapping) — not for an unsupervised first-time user.

## 7. Cafe-Specific Data Considerations

- Price fields may include currency symbols ("P120.00") — strip/parse before validation
- Category names vary ("Drinks" vs "Beverages") — resolve via fuzzy-match-or-create, not strict enum
- Use **SKU**, not product name, as the dedup key
- Stock tracking optional per product

## 8. Build Order

| Phase | Scope | Status |
|---|---|---|
| 0 | Lock core schema + API contracts | Done |
| 1 | Parser service (file -> headers + sample rows) | Done |
| 2 | Mapping engine (headers -> suggested field mapping) | Done |
| 3 | Mapping UI (two-column mapping + live preview) | Done |
| 4 | Validation engine (per-row error reporting) | Done |
| 5 | Import executor (batched commit + rollback via importBatchId) | Done |
| 6 | Saved mapping templates | Done |

## 9. Open Questions

- Machine spec/OS baseline across target cafes
- Pricing model — one-time sale vs. subscription
- Whether any cafes have occasional internet access (enables cloud backup + update check)

## 10. Notes & Decisions (Running Log)

### 2026-07-16
- Schema aligned with import wizard plan.
- Added to Product: sku, basePrice, isActive, trackStock, importBatchId, customFields.
- sku and basePrice made optional — variant-only products do not need them.
- customFields stored as String? (serialized JSON) — SQLite via Prisma does not support native Json type.
- isAvailable (runtime toggle) kept alongside new isActive (permanent flag) — they serve different purposes.
- Built parser service (`/api/import/parse` and `/api/import/parse-full`) using papaparse and xlsx.
- Built mapping engine (`lib/import/mapper.ts`) and validation engine (`lib/import/validator.ts`).
- Built commit endpoint (`/api/import/commit`) for batch insertion and rollback, creating new categories as needed.
- Built mapping template store (`/api/import/templates`) for saving header mappings.
- Built 4-step Import Wizard UI (`/import/page.tsx` and `import.css`).
- Modified `RootLayout` by wrapping the import wizard in a separate scoped layout to fix scrolling issues with `overflow-hidden`.
- Added Import Wizard link to `Sidebar`.
