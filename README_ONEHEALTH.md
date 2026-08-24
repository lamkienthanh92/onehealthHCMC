# BREATHHCMC — One Health Exposure Explorer

Bản nâng cấp từ app gốc (COPD/PM2.5 exposure) sang công cụ đánh giá phơi
nhiễm môi trường đa lớp theo khung One Health cho TP.HCM.

## Cài đặt & chạy

```bash
npm install
npm start
```

Cần Node.js ≥ 16. `npm install` sẽ tải thêm `leaflet` (bản đồ) — máy chạy
lệnh này cần có mạng.

## Những gì đã thêm so với bản gốc

### 1. Bản đồ tương tác (Leaflet) — `src/MapView.jsx`
Hiển thị điểm tọa độ, ranh giới phường (nếu điểm nằm trong TP.HCM), và các
nguồn gần nhất theo từng category (tối đa 8 điểm/category để giữ bản đồ
nhẹ). Click vào từng điểm/vùng để xem chi tiết.

### 2. 13 lớp môi trường One Health — `src/oneHealthGrids.js`
Chuyển đổi từ GeoTIFF (Sentinel-5P, MODIS, WorldPop, GHSL, JRC, VIIRS, SRTM,
Dynamic World, Hansen) thành lưới JS nhẹ (~165KB), tra cứu theo cùng cơ chế
"ô lưới gần nhất" như `PM25_GRID`/`NDVI_GRID` sẵn có:

| Lớp | Nguồn | Đơn vị |
|---|---|---|
| **Dân số** | WorldPop community catalog, 2024, 100m | người/ô 100m |
| NO2, SO2, CO, O3 | Sentinel-5P TROPOMI **2025** | chỉ số tương đối (không phải µg/m³ đã hiệu chỉnh) |
| Nhiệt độ bề mặt (LST) | MODIS MOD11A2 2025 | °C |
| Ánh sáng đêm | VIIRS DNB, 12 tháng gần nhất | nW/cm²/sr |
| Mật độ xây dựng | GHSL P2023A, 2020 (dữ liệu quan trắc thật) | % |
| Tần suất mặt nước | JRC Global Surface Water 1984–2021 | % |
| Độ cao | SRTM 30m | m |
| Lớp phủ đất | Dynamic World V1, 12 tháng gần nhất | 9 class |
| Độ phủ tán cây (2000) | Hansen Global Forest Change | % |
| Mất rừng từ 2000 | Hansen Global Forest Change 2000–2025 | % |

**Về dân số:** dataset `projects/sat-io/open-datasets/WORLDPOP/pop` (community
catalog, không phải catalog chính thức Google) phủ 2015–2030, nhưng chỉ dựa
trên 2 vòng tổng điều tra dân số thật (~2010, ~2020) — càng xa 2020 càng mang
tính ngoại suy mô hình. Đã chọn năm 2024 làm mặc định (gần mốc điều tra nhất
trong phạm vi dữ liệu có), không dùng 2026 dù dataset có sẵn số cho năm đó.

### 3. Ranh giới 168 phường/xã TP.HCM (sau sáp nhập) — `src/wards.js`
Từ `vietnamese-provinces-database`, đã giản lược hình học (Ramer-Douglas-
Peucker, dung sai ~30m) từ 221.617 điểm xuống 15.290 điểm để giữ bundle
nhẹ (357KB). Hàm `findWard(lat, lng)` dùng point-in-polygon tự viết
(ray casting), không phụ thuộc thư viện ngoài.

### 4. 1.404 điểm One Health mới từ OSM — `src/newSourcesData.js`
7 category mới, gộp chung vào `SOURCES`/`SOURCE_CATS` hiện có qua
`sourceUtils.js`:

| Category | Số điểm | Gồm |
|---|---|---|
| `clinic` | 582 | clinic, doctors, pharmacy, dentist |
| `school` | 357 | school, kindergarten, university |
| `farm` | 291 | farmland, farmyard |
| `recreation` | 111 | playground, sports_centre, recreation_ground |
| `publicinfra` | 27 | drinking_water, recycling, waste_disposal |
| `veterinary` | 23 | veterinary |
| `butcher` | 13 | butcher shop |

### 5. Excel export mở rộng — `src/excelExport.js`
Sheet "Patient Results" giờ có thêm: tên phường, 13 cột One Health (kể cả
dân số), và 7 sheet mới (1 sheet/category mới) — tổng cộng 17 sheet.

### 6. Bỏ "Exposure Score" — `src/air.js`
Chỉ số tổng hợp cũ (0.6×khoảng cách + 0.4×PM2.5) là công thức tự đặt,
không có cơ sở khoa học đã được kiểm chứng — đã xóa khỏi tính toán, giao
diện, và Excel export. Thay vào đó, dùng trực tiếp các biến thô (khoảng
cách, PM2.5, 13 lớp One Health) làm covariates trong mô hình thống kê của
bạn — đây là khuyến nghị đã đưa ra từ đầu và giờ đã thực hiện triệt để.
Thẻ thứ 4 trong lưới kết quả (trước là "Exposure Score") giờ hiển thị
**Phường + mật độ dân số** — dữ liệu thật, không phải chỉ số tính toán.

### 7. Giao diện — theme "Trạm quan trắc thực địa" (`src/theme.js`, `src/ui.jsx`)
**Vòng 1** chỉ đổi mã màu — kết quả vẫn trông như form Bootstrap tô lại
màu (đúng như phản hồi nhận được). **Vòng 2** dựng lại ngôn ngữ thị giác
thật sự, tách thành bộ primitives dùng chung ở `src/ui.jsx`:

- **Bộ icon SVG line-art tự vẽ** (`Icon`, `CAT_ICON`) — thay hết emoji lẫn
  lộn bằng 1 style nhất quán (factory, basket, trash, droplet, fuel, cross,
  tree, forest, cap, pill, paw, sprout, ball, knife, tap, thermo, wind,
  cloudRain, leaf, ward, people, ruler...).
- **`IconChip`** — icon đặt trong khối vuông bo góc màu nhạt (thay vì icon
  trôi nổi không nền).
- **`Readout`** — thẻ chỉ số kiểu "instrument panel": nền trắng, viền trên
  dày 3px màu domain, số liệu IBM Plex Mono, không còn nền pastel phủ kín
  kiểu form nhập liệu.
- **`StatusDot`** — chấm tròn nhỏ + nhãn, thay toàn bộ badge pill nền đặc
  (trông như Bootstrap alert) bằng phong cách chấm trạng thái tối giản.
- **`SectionHeader`** — icon chip + nhãn mono uppercase + đường kẻ mảnh
  kéo dài, thay tiêu đề section phẳng.
- **`TickGauge`** — thanh đo NDVI/EVI dạng vạch chia (instrument dial)
  thay progress bar phẳng kiểu web form.

Áp dụng lại cho `EnvComponents.js` (Pollution Sources / Green Buffer /
Climate), 4 thẻ chỉ số đầu trang trong `App.jsx`, và toàn bộ badge rủi ro
trong bảng dữ liệu.

**Giới hạn cần biết:** môi trường chỉnh sửa không có trình duyệt để xem
trực tiếp — mọi thay đổi chỉ được kiểm tra ở mức cú pháp (bracket balance,
import path, chạy thử logic JS) chứ chưa tự mắt xác nhận bố cục cuối cùng.
Sau khi `npm start`, nếu chỗ nào chưa ổn, chụp màn hình gửi lại để chỉnh
tiếp theo đúng cái thấy được, thay vì đoán mò thêm.

## Còn thiếu / cần làm tiếp (không tự ý làm vì thiếu dữ liệu hoặc quyết định thiết kế)

- **Batch upload nhiều tọa độ cùng lúc (CSV)** — hiện vẫn nhập từng điểm
  một như bản gốc. Đây là nâng cấp giá trị cao tiếp theo nếu cần chạy
  hàng loạt cho danh sách trường học.
- **Số liệu kinh tế-xã hội cấp phường** (nghèo, thu nhập, nhập cư) —
  không có nguồn mở công khai ở cấp phường tại VN, đã xác nhận ở các
  bước trước.
- **Exposure Score đã bị xóa** (xem mục 6 ở trên) — không còn "vẫn dùng
  công thức heuristic cũ" như ghi chú trước đây.
- **Geo boundary khác** (`geoBoundaries-VNM-ADM1-all.zip`) — không dùng
  vì chỉ ở cấp tỉnh (ADM1), quá thô; đã ưu tiên dùng
  `vietnamese-provinces-database` (cấp phường) thay thế.

## Cấu trúc file mới

```
src/
├── oneHealthGrids.js    # 12 lớp raster môi trường (grid lookup)
├── wards.js              # 168 ranh giới phường + point-in-polygon
├── newSourcesData.js     # 1404 điểm OSM One Health mới
├── MapView.jsx           # Bản đồ Leaflet
├── OneHealthCard.jsx     # Thẻ tóm tắt 12 lớp môi trường
```

## Vòng nâng cấp thứ 3 — 4 cách trình bày tốt hơn

### 1. Thẻ mở rộng (expandable) — `PollutionSummaryCard`, `GreenSummaryCard`
Bấm "▼ Show all nearby" ở góc thẻ Pollution Sources / Green Buffer → hiện
top 5 nguồn gần nhất mỗi category (thay vì chỉ 1 nguồn gần nhất như trước),
sắp xếp gần → xa.

### 2. Heatmap trên bản đồ — `MapView.jsx`
3 nút chuyển đổi phía trên bản đồ: None / Population / Pollution. Dùng
`leaflet.heat`. Heatmap dân số dựng từ `POPULATION_GRID` (3.590/3.780 ô có
dữ liệu); heatmap ô nhiễm dựng từ các điểm industrial/landfill/wastewater/
fuel trong `SOURCES`.

### 3. Nhiều ranh giới phường trong bản đồ — `wards.js: getNearbyWards()`
Trước đây chỉ vẽ 1 phường chứa điểm đo. Giờ vẽ toàn bộ phường có bbox giao
với khung ~2km quanh điểm (thường ra 15–25 phường), phường chứa điểm tô
đậm liền nét, các phường lân cận vẽ nét đứt mờ làm bối cảnh.

### 4. Biểu đồ dân số khi mở rộng — `OneHealthCard.jsx`, `populationStats.js`
Bấm vào ô "Population" trong bảng One Health → hiện biểu đồ cột so sánh
3 giá trị: tại điểm đo / trung bình phường / trung bình TP.HCM (dùng
`recharts`).

**Lưu ý dữ liệu quan trọng đã phát hiện khi làm tính năng này:** lưới dân
số đã downsample xuống ~1,5km/ô (không phải 100m sát nghĩa như nhãn ban
đầu ngụ ý) — nên nhiều phường nhỏ chỉ trùng đúng 1 ô lưới. App tự động
phát hiện trường hợp này và hiển thị cảnh báo ngay trong biểu đồ ("based
on only 1 grid point...") thay vì âm thầm trình bày như số liệu đáng tin.
Nếu cần "trung bình phường" chính xác thật, phải tải lại `WorldPop` ở độ
phân giải gốc 100m không downsample (file sẽ nặng hơn nhiều).

## Vòng nâng cấp thứ 4 — Minh bạch nguồn dữ liệu ngay trong UI

Trả lời câu hỏi trực tiếp: **dữ liệu đường phố (`roads.js`) có phải từ OSM
không?** — Không xác nhận được 100%. File này có sẵn trong zip gốc bạn
upload từ đầu dự án, không có comment ghi nguồn. Cấu trúc (tên đường tiếng
Việt + polyline nhiều đoạn) giống OSM nhưng đây là suy luận, không phải
bằng chứng. Đã ghi rõ mức độ tin cậy "low" cho dòng này trong bảng dưới.

### Thêm mới:
- **`DataSourcesTable.jsx`** — bảng đầy đủ 19 lớp dữ liệu (13 lớp One
  Health + 6 lớp còn lại: đường, PM2.5, NDVI, 2 nhóm OSM, ranh giới
  phường, khí hậu), mỗi dòng có Nguồn / Độ phân giải (gốc → hiển thị) /
  Năm / Mức độ tin cậy (cao/trung bình/thấp). Hiện ở cuối trang kết quả,
  mặc định thu gọn — bấm "Show full table" để xem đầy đủ.
- **Hover tooltip** trên 4 thẻ chỉ số đầu trang và toàn bộ 13 ô One Health
  — di chuột vào bất kỳ ô nào hiện ngay nguồn + độ phân giải, không cần
  mở bảng riêng.
- **Caption ngắn** trong tiêu đề "Pollution Sources" / "Green Buffer" ghi
  rõ "OSM Overpass" / "OSM + MODIS ~1km".

### Phát hiện thêm khi làm minh bạch:
Tính chính xác độ phân giải hiển thị thật (đo trực tiếp từ khoảng cách
giữa các điểm lưới, không chỉ suy luận) — **toàn bộ 10 lớp môi trường đều
bị nén xuống 1,4–2km/ô khi hiển thị**, dù ảnh gốc mịn hơn nhiều (ví dụ
Dynamic World gốc 10m → hiển thị ~1,5km, chênh lệch 150 lần). Đây là hệ
quả trực tiếp của việc nén dữ liệu để giữ bundle JS nhẹ — đã ghi rõ cả 2
con số (gốc và hiển thị) cho từng lớp thay vì chỉ nói chung chung "độ
phân giải cao".

## Vòng nâng cấp thứ 5 — Bỏ nén tùy tiện, dùng đúng độ phân giải dữ liệu cho phép

Bạn hỏi thẳng: "sao nén xuống 1.4-2km trong khi có dữ liệu chính xác hơn
mà không dùng?" — Đúng, lần trước mình chọn mức nén tùy tiện (target=35-60
cho mọi lớp như nhau) mà không thực sự tính xem từng lớp *cần* nén đến đâu.
Đã tính lại theo đúng độ phân giải gốc của từng nguồn:

| Nhóm lớp | Độ phân giải gốc | Trước đây | Bây giờ |
|---|---|---|---|
| NO2, SO2, CO, O3, LST | ~1km | ~2km (nén 2x không cần thiết) | **~1km — giữ nguyên gốc, không nén** |
| Night Lights | ~500m | ~2km (nén 4x không cần thiết) | **~500m — giữ nguyên gốc** |
| Built-up, Water, Population | 100m | ~1.4-1.7km | **~300m** |
| Elevation, Tree Cover, Forest Loss | 30m | ~1.8km | **~390m** |
| Land Cover (Dynamic World) | 10m | ~1.5km | **~350m** |

Bundle tăng từ 165KB → **~2.6MB** — chấp nhận được cho app nghiên cứu
chạy local qua `npm start`, không phải web công khai cần tối ưu tải trang.

**Kết quả đo được:** vấn đề "trung bình phường chỉ dựa trên 1 ô lưới"
(cảnh báo ở vòng nâng cấp trước) đã cải thiện — thử lại phường Bến Thành,
số ô lưới dân số trùng trong phường tăng từ **1 ô → 18 ô**, "trung bình
phường" giờ mới thực sự là trung bình, không còn trùng khớp máy móc với
giá trị tại 1 điểm đo.

**Lỗi phát hiện thêm khi làm lại:** LST (nhiệt độ) trước đó bị áp công
thức chuyển đổi Kelvin→Celsius **2 lần** (1 lần đã làm sẵn trong code
Earth Engine lúc export, 1 lần lặp lại trong bước xử lý Python) — dữ liệu
gốc thực ra đã là độ C sẵn (25–36°C, hợp lý cho HCMC). Đã sửa, không phát
hiện dấu hiệu bug này ảnh hưởng đến quyết định trước đó vì giá trị vẫn
"trông hợp lý" một cách tình cờ — nhắc để bạn biết luôn kiểm tra range giá
trị thực tế, không chỉ tin vào code "chạy không lỗi".

## Vòng nâng cấp thứ 6 — Đẩy sát native resolution nhất có thể

Bạn hỏi tiếp: "300m hay 1km vẫn dài, cần sát hơn nữa" — đúng, đã đẩy tiếp:

| Nhóm | Vòng trước | Bây giờ | Ghi chú |
|---|---|---|---|
| NO2/SO2/CO/O3/LST | ~1km | **~1km — không đổi** | Giới hạn vật lý cảm biến Sentinel-5P/MODIS, không thể mịn hơn từ nguồn này |
| Night Lights | ~500m | **~500m — không đổi** | Giới hạn vật lý cảm biến VIIRS |
| Built-up/Water/Population | ~300m | **100m — FULL NATIVE, không nén nữa** | |
| Elevation/Tree Cover/Forest Loss | ~390m | **~150m** | Native 30m nhưng full-native sẽ ~130MB/lớp — không khả thi |
| Land Cover | ~350m | **100m** | Native 10m nhưng full-native sẽ >100MB — không khả thi |

Bundle tăng từ 2.6MB → **~14.6MB** (`oneHealthGrids.js`).

**Kết quả đo được (không chỉ nói suông):** cỡ mẫu tính "trung bình phường"
ở phường Bến Thành tăng từ **1 ô → 18 ô (vòng trước) → 170 ô (vòng này)**.
Đây mới thực sự là một con số trung bình thống kê đáng tin.

**Giới hạn thật sự còn lại** (không thể cải thiện thêm từ nguồn dữ liệu
hiện có, đã giải thích rõ trong `GRID_META[key].note` và tooltip UI):
- 6 lớp khí/nhiệt/ánh sáng đêm bị giới hạn bởi chính độ phân giải cảm biến
  vệ tinh — đây không phải lựa chọn kỹ thuật của mình, mà là vật lý.
- 4 lớp còn lại (elevation, tree cover, forest loss, land cover) dùng
  ~100-150m thay vì native 10-30m vì full-native sẽ tạo file 100+MB/lớp,
  trình duyệt không tải/parse nổi ở mức hợp lý.

**Lưu ý hiệu năng:** với bundle ~19MB (đã cộng roads.js/sources.js/wards.js
sẵn có), `npm start` lần đầu và load trang sẽ chậm hơn đáng kể so với các
vòng trước (vài giây thay vì gần như tức thời). Đây là đánh đổi trực tiếp
cho độ chính xác — nếu thấy quá chậm khi dùng thực tế, báo lại để mình
lùi về mức trung gian (vòng 5, ~2.6MB) thay vì mức tối đa này.

## Vòng nâng cấp thứ 7 — Sửa heatmap xấu + population không có thông tin

### Heatmap dân số — lỗi kỹ thuật đã tìm ra và sửa
Đo thử phân bố giá trị thì phát hiện: nếu chuẩn hóa cường độ heatmap theo
giá trị max (như code cũ làm), **89.3% điểm sẽ gần như vô hình** — vì dân
số đô thị phân bố kiểu lũy thừa (rất ít điểm cực đông, còn lại thưa dần),
chuẩn hóa tuyến tính theo max khiến cả thành phố trông trống trơn trừ vài
chấm sáng. Đã sửa 3 điều trong `MapView.jsx`:
1. Gộp 497.000 điểm gốc xuống còn ~17.000 điểm đại diện (gộp khối 6x6 ô)
   — trước đây nạp thẳng 497K điểm vào plugin heatmap chắc chắn giật/lag.
2. Chuẩn hóa theo percentile 95 (không phải max tuyệt đối) + biến đổi căn
   bậc hai — tỷ lệ điểm "vô hình" giảm từ 89.3% xuống còn 15.6%.
3. Đổi gradient từ tông màu đất (dễ nhìn đục) sang thang nhiệt chuẩn
   xanh dương→xanh lá→vàng→cam→đỏ, dễ đọc trực quan hơn.

### Phần dân số — từ "không thể hiện gì" thành có xu hướng thật
Trước: chỉ có 1 biểu đồ 3 cột so sánh (điểm đo / phường / thành phố),
giấu sau 1 cú click nhỏ dễ bị bỏ qua. Giờ (`populationStats.js`,
`OneHealthCard.jsx`), mặc định hiện luôn khi có kết quả:
- **Percentile badge** — "đông dân hơn X% khu vực TP.HCM đã đo" (dễ hiểu
  hơn nhiều so với con số "217.6 người/ô" trần trụi không có bối cảnh).
- **Biểu đồ xu hướng mật độ theo khoảng cách** (200m/500m/1km/2km/3km) —
  đây là biểu đồ **xu hướng thật** bạn yêu cầu, tính trực tiếp từ lưới
  dân số 100m mới có, chạy trong 5-6ms.
- Giữ biểu đồ so sánh 3 cột cũ làm thông tin phụ.

Test thử với 2 điểm để kiểm chứng logic hợp lý: Q1 (đông dân hơn 96% TP,
mật độ tương đối phẳng theo bán kính vì cả khu vực đều đông) vs Củ Chi
(đông dân hơn 38% TP, mật độ tăng dần theo bán kính — hợp lý vì điểm đo
nằm ở vùng thưa nhưng gần trung tâm xã hơn khi mở rộng bán kính).

## Vòng nâng cấp thứ 8 — Sửa lỗi crash khi deploy (JavaScript heap out of memory)

Deploy lên Netlify báo lỗi `FATAL ERROR: Ineffective mark-compacts near
heap limit Allocation failed - JavaScript heap out of memory` khi chạy
`npm run build`. Nguyên nhân: `oneHealthGrids.js` nặng 14.6MB dạng JS
literal — khi build production, bundler (webpack/babel) phải dựng cây cú
pháp (AST) cho toàn bộ literal đó trong bộ nhớ, chi phí gấp 10-20 lần kích
thước file gốc, vượt quá giới hạn heap mặc định (~2GB) của môi trường
build Netlify.

### Sửa đúng gốc rễ (không phải band-aid)
Chuyển toàn bộ dữ liệu lưới (19MB) ra khỏi bundle JS, thành file JSON tĩnh
`public/data/grids.json` — CRA copy nguyên vẹn file này vào build output,
**không hề đưa qua bundler/babel để biên dịch**. Trình duyệt tự `fetch()`
+ `JSON.parse()` lúc chạy, nhẹ hơn nhiều so với việc bundler phải "hiểu"
code JS.

### Các thay đổi cụ thể:
- **`gridLoader.js`** (mới) — quản lý việc `fetch()` 1 lần, cache lại cho
  cả session. Các hàm `loadGrids()`, `getGrids()`, `isGridsLoaded()`.
- **`oneHealthGrids.js`** — từ 14.6MB xuống còn **5.3KB**, giờ chỉ chứa
  `GRID_META` (nhỏ) và hàm tra cứu đọc dữ liệu qua `getGrids()`.
- **`populationStats.js`, `MapView.jsx`** — đổi từ import tĩnh sang gọi
  `getGrids()` lúc runtime.
- **`App.jsx`** — thêm loading gate: tải grids 1 lần lúc mở app, hiện
  banner "⏳ Loading ~19MB..." và khóa nút Measure cho đến khi tải xong.
- **`netlify.toml`** (mới) — tăng heap build lên 4GB làm lớp an toàn bổ
  sung (dù không còn thật sự cần thiết sau khi sửa gốc rễ).

**Đã kiểm chứng bằng cách chạy thật** (mô phỏng `fetch` qua Node, đọc
thẳng file JSON): tải 19MB trong 487ms, tra cứu ra đúng số liệu như
trước, Excel export vẫn hoạt động, header/row vẫn khớp 964 cột.

**Tổng bundle JS giờ chỉ còn ~3.1MB** (chủ yếu do `roads.js`/`sources.js`
gốc, không phải phần One Health mới) — không còn nguy cơ OOM khi build.

## Vòng nâng cấp thứ 9 — Đa dạng biểu đồ cho nhiều biến + tương quan + OSM

Trước đây chỉ có population có biểu đồ. Giờ thêm 3 mảng mới, dùng 3 loại
chart khác nhau (đúng yêu cầu "đa dạng"):

### 1. Distance Trends (`DistanceTrendsGrid.jsx`, `gridStats.js`)
Tổng quát hóa hàm distance-profile (trước chỉ dùng cho dân số) để áp dụng
cho BẤT KỲ lớp nào trong 13 lớp — hiện đang chọn 5 biến tiêu biểu
(Population, NO2, Land Temp, Tree Cover, Built-up), mỗi biến 1 mini line
chart riêng. Tự động báo "Grid too coarse" thay vì hiện `undefined` khi
bán kính nhỏ hơn độ phân giải lưới (ví dụ NO2 ở 200m).

### 2. City-wide Correlations (`CorrelationPanel.jsx`)
Tính hệ số tương quan Pearson thật (không phải minh họa) giữa 6 cặp biến
có ý nghĩa One Health, lấy mẫu từ toàn bộ lưới thành phố:

| Cặp biến | r | Diễn giải |
|---|---|---|
| NO2 vs Built-up | +0.50 | Đô thị hóa đi cùng ô nhiễm giao thông/công nghiệp |
| LST vs Tree Cover | -0.36 | **Xác nhận hiệu ứng đảo nhiệt đô thị** — cây xanh làm mát |
| Population vs NO2 | +0.55 | Gánh nặng phơi nhiễm — vùng đông dân hứng ô nhiễm nhiều hơn |
| Built-up vs Elevation | +0.08 | Gần như không liên quan (hợp lý, TP.HCM khá bằng phẳng) |
| Water vs LST | -0.17 | Mặt nước có hiệu ứng làm mát yếu |
| Night Lights vs Population | +0.25 | Hoạt động kinh tế theo dân số, tương quan yếu-vừa |

**Cảnh báo khoa học quan trọng đã ghi rõ trong UI:** đây là tương quan
**sinh thái** (ecological, theo ô lưới) chứ không phải tương quan cá
nhân — không suy luận được cho từng người/hộ gia đình cụ thể, và tương
quan không phải nhân quả (2 biến có thể cùng phụ thuộc 1 yếu tố thứ 3
như mật độ đường). Đây là loại cảnh báo bắt buộc phải có khi trình bày
tương quan dữ liệu sức khỏe/môi trường — thiếu nó rất dễ gây hiểu lầm.

### 3. OSM Proximity Radar (`SourceExposureRadar.jsx`)
Biểu đồ radar (loại hoàn toàn khác 2 loại trên) — điểm "gần gũi" 0-100
cho 2 nhóm category OSM: Rủi ro/Ô nhiễm (industrial, landfill, wastewater,
fuel, market, butcher, farm) và Tiện ích/Xanh (park, forest, school,
clinic, hospital, veterinary, recreation, publicinfra). Test với chợ Bến
Thành ra đúng logic: chợ/công viên/bệnh viện gần → điểm 78-98; trại chăn
nuôi/thú y xa → điểm 0.

## Vòng nâng cấp thứ 10 — Bỏ heatmap mờ nhòe, đổi sang choropleth ô lưới thật

Bạn phản hồi đúng: xem ảnh chụp thì thấy heatmap **không hề hiện ra** —
chỉ thấy các chấm marker nguồn OSM, không có lớp gradient nào cả. Nguyên
nhân nhiều khả năng: `leaflet.heat` là plugin UMD cũ, dễ gặp lỗi
interop âm thầm khi chạy trong môi trường bundler ESM hiện đại (không
báo lỗi, chỉ đơn giản là không attach `L.heatLayer` vào global `L`).

Thay vì cố sửa plugin cũ, đổi hẳn cách tiếp cận theo đúng góp ý của bạn
("vùng nào biên giới ra sao thì trông thế nào") — dùng **choropleth**:
tô màu từng ô lưới thật với đường viền rõ ràng, thay vì heatmap mờ nhòe
kiểu kernel density (vốn không hợp với dữ liệu dạng lưới rời rạc).

### Thay đổi cụ thể (`MapView.jsx`)
- **Bỏ hẳn `leaflet.heat`** khỏi dependencies — không cần plugin ngoài
  nữa, chỉ dùng `L.rectangle` gốc của Leaflet.
- **Choropleth dân số**: tô màu trực tiếp từng ô lưới 100m thật (không
  làm mờ/nội suy), 5 màu theo ngũ phân vị toàn thành phố (P20/P40/P60/P80)
  — xanh dương nhạt (thấp) → đỏ đậm (cao). Test quanh Q1 ra 2.853 ô,
  đủ nhẹ để canvas render mượt.
- **Choropleth mật độ ô nhiễm**: gộp điểm OSM (industrial/landfill/
  wastewater/fuel) vào lưới ~280m tự dựng, tô màu theo số lượng nguồn/ô
  (1/2/3/4/5+). Test quanh Q1 ra 25 ô có nguồn, hầu hết đếm được 1,
  có 1 ô đếm được 2 — đúng logic vì nguồn ô nhiễm phân bố thưa.
- **Chú giải màu (legend)** hiện ngay cạnh nút chuyển đổi, không cần
  đoán ý nghĩa màu sắc.
- Dùng `preferCanvas: true` cho toàn bản đồ — không chỉ nhanh hơn cho
  choropleth mà còn giúp cả marker/ranh giới phường render mượt hơn.
- Bật `preferCanvas` khiến choropleth tự động vẽ dưới marker/ranh giới
  (`bringToBack()`) để điểm đo và viền phường không bị che.

**Đã kiểm chứng bằng cách chạy thật** logic tạo ô lưới (không chỉ đọc
code): số ô, ngưỡng màu, phân bố count đều hợp lý và đã in ra số liệu cụ
thể ở trên.
