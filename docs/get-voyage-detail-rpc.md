# `get_voyage_detail` RPC — 航程詳情一次取得

> 資料庫：`siloah_product`
> 建立日期：2026-03-31
> 狀態：已部署，可使用

---

## 用途

一次呼叫取得航程詳情頁所有核心資料（航程 + 船隻 + 品牌 + 行程表 + 艙房 + 價格 + 港口），取代原本前端需要 4 輪、13+ 次查詢的方式。

**不影響現有的 `search_voyages` RPC** — 這是新增的 RPC，現有功能不受影響。

---

## 參數

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `p_cruise_id` | `uuid` | （必填） | 航程 ID |
| `p_locale` | `text` | `'en'` | 語言代碼，用於出發/到達港口名稱翻譯（如 `"zh-TW"`） |

---

## 回傳格式

回傳 `jsonb`，結構如下：

```jsonc
{
  "cruise": {
    "id": "uuid",
    "name": "Enticing Douro - Roundtrip Porto",
    "sail_date": "2026-03-26",
    "nights": 7,
    "sea_days": 0,
    "voyage_code": "AD260326",
    "cheapest_price": 3299,
    "cheapest_inside": null,
    "cheapest_outside": 3299,
    "cheapest_balcony": 4599,
    "cheapest_suite": 8299,
    "destinations": ["Europe", "Rhine"],
    "route_map_image": null,
    "rating": "luxury",
    "themes": ["river", "wine"],
    "start_port_unlocode": "PTOPO",
    "end_port_unlocode": "PTOPO"
  },

  "ship": {
    "id": "uuid",
    "name": "AmaDouro",
    "nice_url": "amawaterways/amadouro",
    "tonnage": null,
    "occupancy": 102,
    "star_rating": 5,
    "total_cabins": 51,
    "total_crew": 36,
    "launched": "2019-01-01",
    "length": 80,
    "speed": null,
    "ship_class": null,
    "video_url": "https://youtube.com/...",
    "refit_year": null,
    "width_m": 11.4,
    "ship_type": "river",
    "ship_size": "small",
    "ship_style": "luxury",
    "adults_only": false
  },

  "brand": {
    "id": "uuid",
    "name": "AmaWaterways",
    "nice_url": "amawaterways",
    "logo": "lines/xxx/logo.webp",
    "currency": "USD"
  },

  "start_port": {
    "id": "uuid",
    "name": "波爾圖",       // 已根據 p_locale 翻譯
    "country": "葡萄牙"     // 已根據 p_locale 翻譯
  },

  "end_port": {
    "id": "uuid",
    "name": "波爾圖",
    "country": "葡萄牙"
  },

  "itinerary": [
    {
      "day": 1,
      "port_name": "Porto, Portugal",
      "description": "Embarkation...",
      "country": "Portugal",
      "arrive_time": null,
      "depart_time": "18:00",
      "arrive_date": "2026-03-26",
      "depart_date": "2026-03-26",
      "latitude": 41.1579,
      "longitude": -8.6291,
      "images": "[{\"name\":\"Porto\",\"href\":\"...\"}]",  // JSON string，需前端 parse
      "unlocode": "PTOPO",
      // canonical_ports 已 JOIN（不需額外查詢）
      "cp_id": "uuid",
      "cp_name": "Porto",           // 英文原名（翻譯由前端處理）
      "cp_country": "Portugal",
      "cp_description": "Porto is a city...",
      "cp_widgety_summary": "...",
      "cp_has_article": true         // 是否有港口文章
    }
    // ...更多天
  ],

  "cabins": [
    {
      "id": "uuid",
      "external_id": "ABC123",
      "cabin_name": "Suite",
      "cabin_code": "SA",
      "cabin_type": "suite",
      "accommodation_class": "luxury",
      "description": "Spacious suite with...",
      "widgety_description": "...",
      "cabin_size_min": 28,
      "cabin_size_max": 28,
      "max_occupancy": 2,
      "facilities": ["balcony", "bathtub", "minibar"],
      "accessible": false,
      "colour_code": "#8B4513"
    }
    // ...更多艙房
  ],

  "prices": [
    {
      "cabin_type_id": "ABC123",     // 對應 cabins[].external_id
      "price": 8299,
      "taxes": 150,
      "ncf": null
    }
    // ...更多價格
  ]
}
```

---

## 呼叫範例

### JavaScript (Supabase Client)

```javascript
const { data } = await supabase.rpc('get_voyage_detail', {
  p_cruise_id: '042c097d-9480-49c2-91e3-91820768251e',
  p_locale: 'zh-TW'
})

// data 就是上面的 JSONB 結構
console.log(data.cruise.name)       // "Enticing Douro - Roundtrip Porto"
console.log(data.start_port.name)   // "波爾圖"（已翻譯）
console.log(data.itinerary.length)  // 16（天數）
console.log(data.cabins.length)     // 6（艙房類型數）
```

### Swift (iOS)

```swift
let response = try await supabase.rpc("get_voyage_detail", params: [
    "p_cruise_id": cruiseId,
    "p_locale": "zh-TW"
]).execute()

let detail = try JSONDecoder().decode(VoyageDetail.self, from: response.data)
```

### cURL

```bash
curl -X POST "https://qsfwktybcgxqjigwbyzf.supabase.co/rest/v1/rpc/get_voyage_detail" \
  -H "apikey: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_cruise_id":"042c097d-...","p_locale":"zh-TW"}'
```

---

## RPC 已包含 vs 前端需自行處理

### ✅ RPC 已包含

| 資料 | 說明 |
|------|------|
| 航程基本資訊 | name, date, nights, prices, destinations, rating, themes |
| 船隻規格 | tonnage, occupancy, cabins, crew, launched, video_url 等 |
| 品牌資訊 | name, slug, logo, currency |
| 出發/到達港口 | **已翻譯**（根據 p_locale） |
| 行程表 | 每天的港口、時間、座標，**已 JOIN canonical_ports** |
| 艙房類型 | 所有欄位，按 cabin_type + cabin_name 排序 |
| 價格 | 所有 cabin 的價格、稅金 |

### ❌ 前端需自行查詢

| 資料 | 查詢方式 | 說明 |
|------|---------|------|
| 船隻翻譯 | `translations` 表 `WHERE table_name='ships'` | ship.name 的多語言版本 |
| 品牌翻譯 | `translations` 表 `WHERE table_name='cruise_lines'` | brand.name 的多語言版本 |
| 航程名翻譯 | `translations` 表 `WHERE table_name='cruises'` | cruise.name 的多語言版本 |
| 艙房名翻譯 | `translations` 表 `WHERE table_name='cabin_types'` | cabin_name 的多語言版本 |
| 港口名翻譯 | `translations` 表 `WHERE table_name='canonical_ports'` | 行程表裡每個港口的翻譯 |
| 船隻圖片 | `cruise_media` `WHERE entity_type='ship'` | hero, cover, gallery 圖片 |
| 艙房圖片 | `cruise_media` `WHERE entity_type='cabin_type'` | 每個艙房的照片 |
| 港口圖片 | `cruise_media` `WHERE entity_type='canonical_port'` | 行程表裡港口的照片 |

> **建議**：以上查詢可全部用 `Promise.all` 並行執行（1 輪 round trip）。

---

## 效能

| | 舊方式（多輪查詢） | 新方式（RPC） |
|---|---|---|
| DB round trips | 4 輪（順序等待） | 1 次 |
| 查詢次數 | 13+ | 1 |
| 回應時間 | ~500ms | **~170ms** |
| canonical_ports 瓶頸 | 有 | 無（DB 內部 JOIN） |

---

## 注意事項

1. **`images` 欄位是 JSON string** — itinerary 裡的 `images` 是存在 DB 裡的 JSON 字串，前端需要 `JSON.parse()` 處理
2. **`prices[].cabin_type_id` 對應 `cabins[].external_id`** — 不是 `cabins[].id`（UUID），而是 Widgety/Traveltek 的外部 ID
3. **品牌 logo 是 R2 key** — 需要加前綴 `https://media.siloah.travel/` 組成完整 URL
4. **charter 航程** — 如 Tauck 使用 Ponant 的船，`brand` 回傳的是 Tauck（航程的品牌），不是 Ponant（船的品牌）
5. **cruise 不存在時回傳 `null`** — 前端需處理 404

---

## 各介面建議用法

### Web 前台（siloah_web）

```
1. 呼叫 get_voyage_detail RPC（拿到所有核心資料）
2. 並行查翻譯 + 圖片（1 輪 Promise.all）
3. 渲染頁面
```

Hero 區域可以用 RPC 回傳的資料直接渲染（不等翻譯和圖片），Body 區域等翻譯和圖片到了再渲染（streaming）。

### Mobile App（siloah_app）

```
1. 呼叫 get_voyage_detail RPC
2. 並行查翻譯 + 圖片
3. 用 locale 版本的資料渲染畫面
```

建議快取 RPC 結果，使用者切換航程時先顯示快取再更新。

### MCP Server（siloah_mcp）

MCP 可以直接用 RPC 回傳的英文資料（`p_locale='en'`），不需要額外查翻譯和圖片。一次呼叫就夠。
