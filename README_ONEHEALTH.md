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
