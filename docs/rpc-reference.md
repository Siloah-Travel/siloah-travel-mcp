# Siloah Product DB — RPC 參考文件

> 給所有專案（siloah_web / siloah_app / siloah_internal）共用
> 資料庫：`siloah_product`
> 最後更新：2026-04-07
> RPC v2 規劃詳見：`~/.claude/plans/rpc-v2-plan.md`

---

## 總覽

### 前端 / App 用 — v2 新版（已部署）

| # | RPC | 用途 | p_locale | 翻譯覆蓋 | 狀態 |
|---|-----|------|----------|---------|------|
| 1 | `get_voyage_list` | 航程搜尋（v2） | ✅ | cruise/ship/brand/port 全翻 + p_search 跨語言搜尋 | ✅ 2026-04-06 |
| 2 | `get_voyage_detail` | 航程詳情（v2） | ✅ | cruise/ship/brand/cabin/port/itinerary 全翻 + article_summary | ✅ 2026-04-06 |

### 前端 / App 用 — 舊版（仍在運作，逐步遷移）

| # | RPC | 用途 | p_locale | 翻譯覆蓋 | v2 對應 |
|---|-----|------|----------|---------|---------|
| 3 | `search_voyages` | 航程搜尋（舊） | ✅ | 港口名 | → `get_voyage_list` |
| 4 | `voyage_filter_bounds` | 篩選範圍 | ✅ | 港口名 | → `get_voyage_filters`（未建）|
| 5 | `get_port_by_slug` | 港口詳情 | ✅ | 港口全欄位 | → `get_port_detail`（未建）|
| 6 | `search_content` | RAG 語意搜尋 | ✅ | 無（回傳英文） | 保持原名 |
| 7 | `get_ship_detail` | 船隻詳情 | ✅ | ship/brand/cabin/dining/facility/intro/deck 全翻 | 保持（待加 p_slug）|
| 8 | `get_brand_list` | 品牌列表 | ✅ | brand name + description | 保持 |

### v2 尚未建立的

| RPC | 用途 | 優先級 |
|-----|------|--------|
| `get_voyage_filters` | 取代 voyage_filter_bounds | 中 |
| `get_brand_detail` | 品牌詳情（新建） | 中 |
| `get_ship_list` | 船隻列表（新建） | 中 |
| `get_port_list` | 港口列表（新建） | 中 |
| `get_port_detail` | 取代 get_port_by_slug | 中 |

### 工具型（3 個）

| # | RPC | 用途 |
|---|-----|------|
| 8 | `get_translation_progress` | 各表各欄位各語言翻譯完成數（statement timeout 風險，大表慢） |
| 9 | `get_translation_stats` | 翻譯統計摘要（同上） |
| 10 | `get_estimated_counts` | 大表筆數估計（用 pg_class.reltuples，秒回） |

### 共用 VIEW（2 個）

| VIEW | 用途 |
|------|------|
| `distinct_countries` | 國家清單（country_en + iso），~150 筆 |
| `translations` | 翻譯統一讀取介面（合併 translations_raw + shared translations）|

### 尚未建立的 RPC

- `get_brand_detail` — 品牌詳情（目前前端直接查表）
- `get_ship_list` — 船隻列表（目前前端直接查表）

---

## 1. `search_voyages` — 航程搜尋

搜尋航程，支援多條件篩選、分頁、排序。

### 參數

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `p_line_id` | `uuid` | NULL | 單一品牌 ID（向後相容） |
| `p_line_ids` | `uuid[]` | NULL | 多品牌 ID（優先於 p_line_id） |
| `p_ship_id` | `uuid` | NULL | 船隻 ID |
| `p_month` | `text` | NULL | 出發月份 `"2026-06"` |
| `p_destinations` | `text[]` | NULL | 目的地陣列 `["Asia", "Mediterranean"]` |
| `p_duration_min` | `int` | NULL | 最短天數 |
| `p_duration_max` | `int` | NULL | 最長天數 |
| `p_price_min` | `numeric` | NULL | 最低價格（USD） |
| `p_price_max` | `numeric` | NULL | 最高價格（USD） |
| `p_departure_country` | `text` | NULL | 出發國家（英文名） |
| `p_arrival_country` | `text` | NULL | 抵達國家（英文名） |
| `p_via_iso` | `text` | NULL | 途經國家 ISO 碼（如 `"JP"`） |
| `p_port_unlocode` | `text` | NULL | 特定港口 UNLOCODE |
| `p_offset` | `int` | 0 | 分頁偏移量 |
| `p_limit` | `int` | 24 | 每頁筆數 |
| `p_locale` | `text` | `'en'` | 語言代碼 |
| `p_departure_iso` | `text` | NULL | 出發國 ISO 碼（AI 用） |
| `p_arrival_iso` | `text` | NULL | 抵達國 ISO 碼（AI 用） |
| `p_departure_port_name` | `text` | NULL | 出發港口英文名（AI 用） |
| `p_arrival_port_name` | `text` | NULL | 抵達港口英文名（AI 用） |
| `p_via_port_name` | `text` | NULL | 途經港口英文名（AI 用） |

### 回傳欄位

| 欄位 | 型別 | 翻譯 | 說明 |
|------|------|------|------|
| `id` | `uuid` | | 航程 ID |
| `name` | `text` | ❌ 英文 | 航程名稱 |
| `sail_date` | `date` | | 出發日期 |
| `nights` | `int` | | 航程天數 |
| `ship_id` | `uuid` | | 船隻 ID |
| `line_id` | `uuid` | | 品牌 ID |
| `start_port_unlocode` | `text` | | 出發港口 UNLOCODE |
| `end_port_unlocode` | `text` | | 抵達港口 UNLOCODE |
| `start_port_name` | `text` | ✅ | 出發港口名稱（已翻譯） |
| `end_port_name` | `text` | ✅ | 抵達港口名稱（已翻譯） |
| `cheapest_price` | `numeric` | | 最低價格（可能 NULL） |
| `destinations` | `text[]` | | 目的地標籤 |
| `cover_image` | `text` | | 航程封面圖 R2 key |
| `ship_image` | `text` | | 船隻圖片 R2 key |
| `total_count` | `bigint` | | 符合條件的總筆數 |

### 內部邏輯

- 自動過濾 `is_enabled = false` 的品牌和船隻
- `sail_date >= today` 只回傳未來航程
- `cheapest_price IS NULL` 的航程不會被 price filter 排除
- 固定按 `sail_date ASC, line_id ASC` 排序

### 可用的目的地值

```
大洲: Europe, Asia, NorthAmerica, SouthAmerica, Africa, Oceania, Worldwide
海域: Mediterranean, Caribbean, Baltic, Alaska, NorthernEurope, Transatlantic, Polar
河流: Rhine, Danube, Nile, Mekong, Rhone, Seine, Douro, Amazon
```

### 呼叫範例

```javascript
const { data } = await supabase.rpc('search_voyages', {
  p_line_ids: ['uuid-silversea', 'uuid-regent'],
  p_destinations: ['Mediterranean'],
  p_month: '2026-08',
  p_offset: 0,
  p_limit: 24,
  p_locale: 'zh-TW'
})
const total = data?.[0]?.total_count ?? 0
```

---

## 2. `voyage_filter_bounds` — 動態篩選範圍

根據目前的篩選條件，回傳天數和價格的 min/max，用於 UI slider。

### 參數

與 `search_voyages` 相同的篩選參數，但**不含** `p_duration_min/max`、`p_price_min/max`、`p_offset`、`p_limit`。

### 回傳欄位

| 欄位 | 型別 | 說明 |
|------|------|------|
| `duration_min` | `int` | 最短天數（0 = 無資料） |
| `duration_max` | `int` | 最長天數 |
| `price_min` | `numeric` | 最低價格（0 = 無價格資料） |
| `price_max` | `numeric` | 最高價格 |

### 使用模式

```
用戶改了篩選條件 → 同時呼叫 search_voyages + voyage_filter_bounds
→ 用回傳的 min/max 更新 UI slider 的範圍
```

---

## 3. `get_voyage_detail` — 航程詳情

一次呼叫取得航程詳情頁所有核心資料（航程 + 船隻 + 品牌 + 行程表 + 艙房 + 價格）。

### 參數

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `p_cruise_id` | `uuid` | （必填） | 航程 ID |
| `p_locale` | `text` | `'en'` | 語言代碼 |

### 回傳結構（jsonb）

```jsonc
{
  "cruise": {
    "id", "name"(❌英文), "sail_date", "nights", "sea_days", "voyage_code",
    "cheapest_price", "cheapest_inside", "cheapest_outside", "cheapest_balcony", "cheapest_suite",
    "destinations", "route_map_image", "rating", "themes",
    "start_port_unlocode", "end_port_unlocode"
  },
  "ship": {
    "id", "name"(❌英文), "nice_url", "tonnage", "occupancy", "star_rating",
    "total_cabins", "total_crew", "launched", "length", "speed",
    "ship_class", "video_url", "refit_year", "width_m",
    "ship_type", "ship_size", "ship_style", "adults_only"
  },
  "brand": {
    "id", "name"(❌英文), "nice_url", "logo", "currency"
  },
  "start_port": {
    "id", "name"(✅翻譯), "country"(✅翻譯)
  },
  "end_port": {
    "id", "name"(✅翻譯), "country"(✅翻譯)
  },
  "itinerary": [{
    "day", "port_name"(❌英文), "description", "country",
    "arrive_time", "depart_time", "arrive_date", "depart_date",
    "latitude", "longitude", "images"(JSON string, 需 parse),
    "unlocode", "cp_id", "cp_name"(❌英文), "cp_country",
    "cp_description", "cp_widgety_summary", "cp_has_article"
  }],
  "cabins": [{
    "id", "external_id", "cabin_name"(❌英文), "cabin_code", "cabin_type",
    "accommodation_class", "description"(❌英文), "widgety_description",
    "cabin_size_min", "cabin_size_max", "max_occupancy",
    "facilities", "accessible", "colour_code"
  }],
  "prices": [{
    "cabin_type_id"(= cabins[].external_id), "price", "taxes", "ncf"
  }]
}
```

### 翻譯覆蓋

- ✅ `start_port.name`、`start_port.country`、`end_port.name`、`end_port.country`
- ❌ cruise.name、ship.name、brand.name、cabins[].cabin_name、itinerary[].cp_name — 需前端自查 translations

### 前端需自行查詢

| 資料 | 查詢方式 |
|------|---------|
| 船隻翻譯 | `translations` WHERE `table_name='ships'` |
| 品牌翻譯 | `translations` WHERE `table_name='cruise_lines'` |
| 航程名翻譯 | `translations` WHERE `table_name='cruises'` |
| 艙房名翻譯 | `translations` WHERE `table_name='cabin_types'` |
| 港口名翻譯 | `translations` WHERE `table_name='canonical_ports'` |
| 船隻圖片 | `cruise_media` WHERE `entity_type='ship'` |
| 艙房圖片 | `cruise_media` WHERE `entity_type='cabin_type'` |
| 港口圖片 | `cruise_media` WHERE `entity_type='canonical_port'` |

### 效能

| | 舊方式（多輪查詢） | RPC |
|---|---|---|
| DB round trips | 4 輪 | 1 次 |
| 查詢次數 | 13+ | 1 |
| 回應時間 | ~500ms | ~170ms |

---

## 4. `get_port_by_slug` — 港口詳情

根據 slug 取得港口完整資料。**翻譯最完整的 RPC**。

### 參數

| 參數 | 型別 | 說明 |
|------|------|------|
| `p_slug` | `text` | 港口 nice_url |
| `p_locale` | `text` | 語言代碼 |

### 翻譯覆蓋

- ✅ name — 港口名稱
- ✅ country — 國家名
- ✅ description — TT 來源描述
- ✅ widgety_summary — Widgety 來源摘要
- ✅ article — AI 生成港口文章

全部欄位都翻譯，fallback 到英文原文。

---

## 5. `search_content` — RAG 語意搜尋

語意搜尋，用於 AI 聊天和全站搜尋。

### 參數

| 參數 | 型別 | 說明 |
|------|------|------|
| `query_embedding` | `vector` | 搜尋向量（OpenAI text-embedding-3-small） |
| `match_threshold` | `float` | 相似度門檻（建議 0.3） |
| `match_count` | `int` | 回傳筆數（建議 10-20） |
| `p_locale` | `text` | 語言代碼（目前未實際用於翻譯） |

### 回傳

content_embeddings 表中符合向量相似度的記錄，包含 content_type、record_id、content 等。

---

## 6. `get_ship_detail` — 船隻詳情

一次呼叫取得船隻完整資料（船隻 + 品牌 + 甲板 + 艙房 + 餐廳 + 設施 + 設施介紹）。**翻譯覆蓋非常完整**。

### 參數

| 參數 | 型別 | 說明 |
|------|------|------|
| `p_ship_id` | `uuid` | 船隻 ID |
| `p_locale` | `text` | 語言代碼（預設 `'en'`） |

### 回傳結構（jsonb）

```jsonc
{
  "ship": {
    "id", "name"(✅), "name_en", "nice_url",
    "speed", "length", "width_m", "tonnage", "launched", "refit_year",
    "occupancy", "total_cabins", "total_crew", "star_rating",
    "ship_type", "adults_only", "cruise_count",
    "teaser"(✅), "teaser_en",
    "introduction"(✅), "introduction_en",
    "highlights"(✅?), "highlights_en",
    "brochures", "video_urls", "hero_image", "gallery_images",
    "ship_class"
  },
  "brand": {
    "id", "name"(✅), "name_en", "nice_url", "logo", "currency", "show_price"
  },
  "decks": [{
    "id", "deck_name"(✅), "deck_name_en", "images"
  }],
  "cabins": [{
    "id", "cabin_name"(✅), "cabin_name_en",
    "cabin_type", "accommodation_class", "cabin_codes", "cabin_colours",
    "description"(✅), "description_en",
    "cabin_size_min", "cabin_size_max", "max_occupancy",
    "facilities", "accessible", "images"
  }],
  "dining": [{
    "id", "name"(✅), "name_en",
    "description"(✅), "description_en",
    "food_type", "experience", "sort_order",
    "images", "menu_pdfs"
  }],
  "facilities": [{
    "id", "name"(✅), "name_en",
    "description"(✅), "description_en",
    "category", "tags", "sort_order",
    "images", "document_pdfs"
  }],
  "facility_intros": [{
    "id", "category",
    "intro"(✅), "intro_en",
    "video"
  }]
}
```

### 翻譯覆蓋

每個文字欄位都有 `xxx` + `xxx_en` 兩個版本。傳 `p_locale='zh-TW'` 時：
- `name` = 翻譯後的中文名
- `name_en` = 英文原名（永遠保留供參考）

| 子項 | 翻譯的欄位 |
|------|-----------|
| ship | ✅ name, teaser, introduction, highlights |
| brand | ✅ name |
| decks | ✅ deck_name |
| cabins | ✅ cabin_name, description |
| dining | ✅ name, description |
| facilities | ✅ name, description |
| facility_intros | ✅ intro |

**這是翻譯覆蓋最完整的 RPC — 基本上所有文字欄位都翻了。**

### 呼叫範例

```javascript
const { data } = await supabase.rpc('get_ship_detail', {
  p_ship_id: 'uuid-silver-nova',
  p_locale: 'zh-TW'
})
console.log(data.ship.name)      // "銀海新星"
console.log(data.ship.name_en)   // "Silver Nova"
console.log(data.cabins[0].cabin_name)  // "皇家套房"
```

---

## 7. `get_brand_list` — 品牌列表

回傳所有啟用的郵輪品牌，含翻譯。

### 參數

| 參數 | 型別 | 說明 |
|------|------|------|
| `p_locale` | `text` | 語言代碼（預設 `'en'`） |

### 回傳欄位

| 欄位 | 型別 | 翻譯 | 說明 |
|------|------|------|------|
| `id` | `uuid` | | 品牌 ID |
| `name` | `text` | ✅ | 品牌名稱（已翻譯） |
| `name_en` | `text` | | 品牌英文名（原文） |
| `nice_url` | `text` | | URL slug |
| `tier` | `text` | | 分級：ultra_luxury / luxury / popular |
| `logo` | `text` | | Logo URL（完整 URL） |
| `hero_image` | `text` | | Hero 圖片 R2 key |
| `ship_count` | `int` | | 該品牌的船隻數 |
| `cruise_count` | `int` | | 該品牌的航程數 |
| `show_price` | `bool` | | 是否顯示價格 |
| `sort_order` | `int` | | 排序 |
| `description` | `text` | ✅ | 品牌描述（已翻譯） |
| `description_en` | `text` | | 品牌英文描述（原文） |

### 翻譯覆蓋

- ✅ `name`、`description`

### 呼叫範例

```javascript
const { data } = await supabase.rpc('get_brand_list', { p_locale: 'zh-TW' })
// data[0].name = "麗晶七海郵輪"
// data[0].name_en = "Regent Seven Seas Cruises"
```

### 品牌分級參考

| tier | 說明 | 品牌 |
|------|------|------|
| `ultra_luxury` | 頂級奢華 | Regent, Scenic Ocean, Seabourn, Uniworld |
| `luxury` | 奢華精選 | Silversea, Explora, Hapag-Lloyd, Holland America, Oceania, etc. |
| `popular` | 精選品牌 | MSC, Disney, Norwegian, HX, Paul Gauguin, Quark |

---

## 工具型 RPC

### 8. `get_translation_progress`

回傳各表各欄位各語言的翻譯完成數量。

- 無參數
- 回傳：`[{ table_name, field_name, locale, count }]`
- ⚠️ 大表（translations_raw 300 萬筆）可能 statement timeout

### 9. `get_translation_stats`

回傳翻譯統計摘要。

- 無參數
- ⚠️ 同上，可能 timeout

### 10. `get_estimated_counts`

回傳大表的筆數估計（用 `pg_class.reltuples`，不做全表掃描）。

- 無參數
- 回傳：`{ cruises: 70007, cruise_itineraries: 870383, cruise_prices: 3213276 }`
- 秒回，不會 timeout

---

## 共用 VIEW

### `distinct_countries`

```sql
SELECT country_en, iso FROM distinct_countries ORDER BY country_en
```

約 150 筆。`iso` 碼可配合 `Intl.DisplayNames` 做前端翻譯。

### `translations`

翻譯統一讀取介面（READ-ONLY VIEW）。

合併兩個來源：
1. `translations_raw` — 直接翻譯（每筆記錄各存一份）
2. `text_translations` + `shared_translation_refs` — 共享翻譯（相同文字只存一份）

```javascript
// 查詢方式（對前端來說就是一張表）
const { data } = await supabase
  .from('translations')
  .select('value')
  .eq('table_name', 'ships')
  .eq('field_name', 'name')
  .eq('record_id', shipId)
  .eq('locale', 'zh-TW')
```

⚠️ **不能 INSERT/UPDATE**（是 VIEW）。寫入翻譯請用 `translations_raw` 表。

---

## 注意事項

1. **圖片 URL**：R2 key 需加前綴 `https://media.siloah.travel/`（`get_brand_list` 的 logo 除外，已是完整 URL）
2. **NULL 價格**：部分航程沒有標價，不會被 price filter 排除
3. **p_locale**：所有前端 RPC 都支援，預設 `'en'`。支援的語言見 `supported_locales` 表（38 個）
4. **翻譯查詢**：`get_ship_detail` 翻譯最完整；`get_voyage_detail` 只翻港口，其他需前端自查 `translations` VIEW
5. **不存在的記錄**：`get_voyage_detail` 回傳各欄位為 null；`get_ship_detail` 回傳空陣列。前端需處理 404
6. **images 是 JSON string**：`get_voyage_detail` 的 itinerary[].images 是 JSON 字串，需 `JSON.parse()`
7. **cabin_type_id 對應 external_id**：`get_voyage_detail` 的 prices[].cabin_type_id 對應 cabins[].external_id（不是 UUID）

---

## Migration 檔案對照

| RPC | 最新 Migration | 專案 |
|-----|---------------|------|
| `search_voyages` | `20260327300000_search_voyages_multi_month.sql` | siloah_web |
| `voyage_filter_bounds` | `20260325100004_rpc_use_via_ports.sql` | siloah_web |
| `get_voyage_detail` | `20260331100000_get_voyage_detail_rpc.sql` | siloah_web |
| `get_port_by_slug` | `20260320100002_get_port_by_slug.sql` | siloah_web |
| `search_content` | `20260322200000_create_content_embeddings.sql` | siloah_web |
| `get_ship_detail` | 無 migration（Supabase Dashboard 建立） | — |
| `get_brand_list` | 無 migration（Supabase Dashboard 建立） | — |
