# 🗺️ VaultFlow — Lộ Trình Phát Triển & Kế Hoạch Nâng Cấp (Product Roadmap)

Tài liệu này ghi lại toàn bộ đánh giá hiện trạng, kế hoạch giải quyết các vấn đề kỹ thuật và lộ trình nâng cấp **VaultFlow** thành ứng dụng quản lý tài chính cá nhân tốc độ cao, bảo mật và tối ưu trải nghiệm trên **Mobile**.

---

## 📊 1. Đánh giá Hiện trạng Dự án (Baseline Audit)

### Điểm mạnh hiện tại:
- **Công nghệ hiện đại:** Next.js 16 (App Router) + Drizzle ORM + Turso (libSQL serverless SQLite).
- **Chi phí & Độ trễ cơ sở hạ tầng gần như bằng 0:** Turso serverless, fallback `file:local.db` mượt mà khi chạy local dev.
- **Bảo mật cơ bản:** HMAC-SHA256 session cookie qua Web Crypto API, Next.js Proxy/Middleware bảo vệ toàn bộ routes.
- **Tính năng nền tảng:** Dashboard tổng quan, Quản lý đa ví (Cash, Bank, E-Wallet, Credit Card), Ngân sách & Hóa đơn lặp lại, Backup/Restore JSON/CSV.

### Các hạn chế cốt lõi cần giải quyết:
1. **Trải nghiệm Mobile (Ưu tiên cao nhất):**
   - Mất hoàn toàn nút Settings trên Mobile Navigation (người dùng điện thoại không thể vào cài đặt).
   - Form thêm nhanh (Quick Add) chưa thân thiện khi bật bàn phím ảo; chip số tiền hardcode theo USD (`+5`, `+10`).
   - Format tiền tệ luôn ép 2 số thập phân `.00` gây mất tự nhiên với VND (`₫50,000.00`).
   - Danh sách giao dịch chưa nhóm theo ngày; nút Xóa phụ thuộc vào CSS `hover` (vốn không có trên màn hình cảm ứng).
2. **Thiếu sót tính năng cơ bản:**
   - Chưa có tính năng **Sửa (Edit) Giao dịch**.
   - Chưa có giao diện người dùng để **Thêm/Sửa/Xóa Danh mục (Categories)**.
   - Chưa có cơ chế đổi Master PIN ngay trên giao diện Web.
3. **Hiệu năng & Khả năng mở rộng:**
   - Dashboard thực hiện hơn 10 round-trip tuần tự tới Turso mỗi lần nạp trang (đặc biệt là vòng lặp 6 tháng lịch sử).
   - Tính toán số dư ví đang nạp toàn bộ lịch sử giao dịch vào RAM server thay vì tính bằng SQL Aggregation (`SUM/GROUP BY`).

---

## 🚀 2. Lộ Trình Phát Triển 3 Giai Đoạn (Action Plan)

```mermaid
flowchart TD
    G1["Giai đoạn 1: Chuẩn hóa Trải nghiệm Mobile & Cốt lõi<br/>(Đã hoàn thành)"] --> G2["Giai đoạn 2: Tối ưu Hiệu năng & Production-Ready<br/>(Đã hoàn thành)"]
    G2 --> G3["Giai đoạn 3: PWA Hoàn chỉnh & Tiện ích Thông minh<br/>(Tiếp theo)"]
```

---

### 🎯 Giai đoạn 1: Chuẩn hóa Mobile-First, Tương tác & Bản địa hóa (Hoàn thành)
- [x] **Điều hướng Mobile thông minh:**
  - Tích hợp nút Settings và trạng thái Vault lên Header Mobile; điều chỉnh thanh Bottom Nav 1-thumb reachability.
- [x] **Bản địa hóa Tiền tệ (VND/JPY/USD):**
  - Viết lại hàm `formatCurrency`: Tự động ẩn số thập phân `.00` cho VND/JPY; vị trí ký hiệu tiền tệ chuẩn hóa (`100.000 ₫`).
  - Đồng bộ `currencySymbol` từ cấu hình hệ thống vào toàn bộ các Modal và Views.
- [x] **Nâng cấp Quick Add Bottom Sheet:**
  - Tránh bị che bởi bàn phím ảo (sử dụng dynamic viewport `dvh` và cuộn form linh hoạt).
  - Chip tăng nhanh số tiền thông minh theo tiền tệ: VND dùng `+20k`, `+50k`, `+100k`, `+200k`, `+500k`.
- [x] **Quản lý Giao dịch toàn diện (Full CRUD):**
  - Thêm Server Action `updateTransaction`.
  - Hỗ trợ chạm vào bất kỳ giao dịch nào để xem chi tiết và Chỉnh sửa (Edit Modal).
  - Nút Xóa/Sửa trực quan trên Mobile (không phụ thuộc vào hover).
  - Phân nhóm giao dịch theo mốc thời gian (*Hôm nay*, *Hôm qua*, *dd/mm/yyyy*).

---

### ⚡ Giai đoạn 2: Tối ưu Hiệu năng & Sẵn sàng cho Production (Hoàn thành)
- [x] **Tối ưu hóa Database SQL (Giảm 80% độ trễ Dashboard):**
  - Gom các câu truy vấn 6 tháng lịch sử thành 1 câu truy vấn SQL `GROUP BY substr(date, 1, 7)` và gom thống kê danh mục qua `GROUP BY`.
  - Tính toán số dư ví trực tiếp trong SQLite (`SUM(CASE WHEN...)`) thay vì quét toàn bộ bảng vào JS memory.
- [x] **Bảo vệ Brute-force & Quản lý PIN:**
  - Áp dụng Rate-limiting (khóa tạm 60 giây sau 5 lần nhập sai mã PIN) kèm đồng hồ đếm ngược trên giao diện.
  - Thêm tính năng đổi Master PIN an toàn bằng HMAC-SHA256 ngay trong trang Settings.
- [x] **Giao diện Quản lý Danh mục (Category Management):**
  - Quản lý danh mục tập trung tại Settings và Budgets: Thêm, sửa tên, đổi icon, đổi màu sắc và ngân sách tháng.
- [x] **Hệ thống Toast Notification & Custom Confirm:**
  - Thay thế toàn bộ `window.confirm` và `window.alert` bằng Toast UI và Modal xác nhận hiện đại, touch-friendly, hỗ trợ safe area.

---

### 📱 Giai đoạn 3: Trải nghiệm PWA Nâng cao & Tiện ích Mở rộng
- [ ] **Service Worker Offline Cache:**
  - Cài đặt Service Worker chuẩn để lưu trữ App Shell, mở app ngay cả khi mất kết nối mạng.
- [ ] **Sinh trắc học (WebAuthn / FaceID / TouchID):**
  - Mở khóa vault trong 1 giây mà không cần gõ 6 số PIN trên thiết bị hỗ trợ.
- [ ] **Smart Input / Quick Paste:**
  - Hỗ trợ dán tin nhắn SMS ngân hàng/chuyển khoản để tự động bóc tách số tiền, ví và nội dung giao dịch.
- [ ] **Báo cáo & Xu hướng Nâng cao:**
  - Biểu đồ lọc theo khoảng thời gian tùy chọn (Tuần này, Tháng này, Quý này, Năm nay).
  - Phân tích tỷ lệ chi tiêu cần thiết vs hưởng thụ (Needs vs. Wants).
