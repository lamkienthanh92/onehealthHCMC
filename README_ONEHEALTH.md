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
Sheet "Patient Results" giờ có thêm: tên phường, 12 cột One Health, và
7 sheet mới (1 sheet/category mới) — tổng cộng 15 sheet theo category.

## Còn thiếu / cần làm tiếp (không tự ý làm vì thiếu dữ liệu hoặc quyết định thiết kế)

- **Batch upload nhiều tọa độ cùng lúc (CSV)** — hiện vẫn nhập từng điểm
  một như bản gốc. Đây là nâng cấp giá trị cao tiếp theo nếu cần chạy
  hàng loạt cho danh sách trường học.
- **Số liệu kinh tế-xã hội cấp phường** (nghèo, thu nhập, nhập cư) —
  không có nguồn mở công khai ở cấp phường tại VN, đã xác nhận ở các
  bước trước.
- **Exposure Score** vẫn dùng công thức heuristic cũ (0.6 khoảng cách +
  0.4 PM2.5) — chưa tích hợp 12 lớp mới vào công thức tổng hợp; nên để
  nguyên dạng biến thô cho phân tích thống kê (khuyến nghị trước đó)
  thay vì nhồi thêm vào 1 con số.
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
