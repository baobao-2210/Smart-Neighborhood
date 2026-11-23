# LỘ TRÌNH PHÁT TRIỂN DỰ ÁN (DEVELOPMENT ROADMAP)
## HỆ THỐNG QUẢN LÝ TỔ DÂN PHỐ

- **Tài liệu:** `DEVELOPMENT_ROADMAP.md`
- **Phiên bản:** 1.0.0
- **Phương pháp tiếp cận:** Feature-Driven Development, Continuous Verification, Tránh nợ kỹ thuật.

---

## 1. TỔNG QUAN CÁC GIAI ĐOẠN PHÁT TRIỂN (PHASE OVERVIEW)

```
Giai đoạn 0: Khởi tạo Nền tảng Monorepo & Cơ sở hạ tầng (Foundation Setup)
     │
     ▼
Giai đoạn 1: Xác thực, Phân quyền RBAC & Đa tổ dân phố (Module 7 & Multi-tenancy)
     │
     ▼
Giai đoạn 2: Quản lý Cư dân & Sổ hộ khẩu điện tử (Module 3)
     │
     ▼
Giai đoạn 3: Thông báo chính thống & Bảng tin cộng đồng (Module 2 & Module 1)
     │
     ▼
Giai đoạn 4: Quản lý Thu chi, Quỹ vận động & VietQR (Module 4)
     │
     ▼
Giai đoạn 5: Bản đồ tiện ích & Phản ánh hiện trường, SOS (Module 5 & Module 6)
     │
     ▼
Giai đoạn 6: Kiểm thử toàn diện, Đóng gói ứng dụng & Thử nghiệm thực địa
```

---

## 2. KẾ HOẠCH CHI TIẾT TỪNG GIAI ĐOẠN

### Giai đoạn 0: Khởi tạo Nền tảng Monorepo & Cơ sở hạ tầng (Foundation Setup)
- **Mục tiêu:** Thiết lập khung sườn dự án chuẩn mực, cấu hình môi trường phát triển và kết nối cơ sở dữ liệu.
- **Các đầu việc chính:**
  1. Khởi tạo Git repository, cấu hình `.gitignore` chuẩn cho Node.js, NestJS, Expo và Android/iOS.
  2. Thiết lập Monorepo với `pnpm-workspace.yaml`:
     - `apps/mobile`: Khởi tạo ứng dụng React Native với Expo Router v4 và TypeScript strict.
     - `apps/backend`: Khởi tạo NestJS REST API server với cấu hình Clean Architecture.
     - `packages/shared`: Khai báo Enums, Interfaces và DTOs dùng chung.
  3. Cấu hình `docker-compose.yml` chạy PostgreSQL 16 (kèm volume lưu trữ bền vững).
  4. Khởi tạo Prisma ORM trong backend, áp dụng Schema đã thẩm định và chạy migration ban đầu (`init`).
  5. Thiết lập Design System Tokens (màu sắc, typography, component cơ bản Button, Card, Input) trên mobile.
- **Tiêu chuẩn hoàn thành (Definition of Done):**
  - Backend NestJS khởi động thành công, kết nối thông suốt với PostgreSQL qua Prisma.
  - Mobile Expo chạy được trên Expo Go hoặc Android Emulator với Expo Router cơ bản.

---

### Giai đoạn 1: Xác thực, Phân quyền RBAC & Quản lý Tổ dân phố (Module 7 & Multi-tenancy)
- **Mục tiêu:** Cung cấp hạ tầng danh tính, bảo vệ dữ liệu và ranh giới tổ dân phố.
- **Các đầu việc chính:**
  1. Xây dựng thực thể `ToDanPho` và seed dữ liệu mẫu 2 tổ dân phố thử nghiệm.
  2. Triển khai `AuthModule` với Dual-Token JWT (Access 15m + Refresh 30d với mã băm trong DB).
  3. Triển khai `JwtAuthGuard`, `RolesGuard` và `NeighborhoodScopeGuard` trên NestJS.
  4. Tích hợp `expo-secure-store` trên mobile để lưu token an toàn.
  5. Xây dựng giao diện Đăng nhập bằng Số điện thoại + Mật khẩu, xử lý tự động refresh token trong Axios.
  6. Xây dựng màn hình Hồ sơ cá nhân (Module 7), hiển thị vai trò (Tổ trưởng/Cư dân) và nút Đăng xuất.
- **Tiêu chuẩn hoàn thành (DoD):**
  - Cư dân và Ban điều hành đăng nhập thành công, nhận đúng quyền hạn và phạm vi tổ dân phố.

---

### Giai đoạn 2: Quản lý Cư dân & Sổ hộ khẩu điện tử (Module 3)
- **Mục tiêu:** Xây dựng cơ sở dữ liệu nhân khẩu học - "trái tim" dữ liệu của mọi hoạt động tổ dân phố.
- **Các đầu việc chính:**
  1. Backend: Xây dựng API quản lý Hộ gia đình (`/api/v1/households`) và Nhân khẩu (`/api/v1/residents`).
  2. Áp dụng ràng buộc duy nhất cho số CCCD và kiểm tra quan hệ chủ hộ.
  3. Phân quyền: Cư dân chỉ xem được hộ của mình; Ban điều hành/CSKV xem và quản lý toàn bộ hộ trong tổ.
  4. Mobile: Màn hình Danh sách hộ gia đình có tìm kiếm số nhà, lọc theo tình trạng thường trú/tạm trú.
  5. Mobile: Màn hình Chi tiết Sổ hộ khẩu số hiển thị thẻ các thành viên trong gia đình.
- **Tiêu chuẩn hoàn thành (DoD):**
  - Tổ trưởng có thể lập sổ hộ khẩu mới, thêm nhân khẩu; Cư dân mở app xem được sổ hộ khẩu của nhà mình.

---

### Giai đoạn 3: Thông báo chính thống & Bảng tin cộng đồng (Module 2 & Module 1)
- **Mục tiêu:** Tạo kênh kết nối hai chiều tức thời giữa Ban điều hành và người dân.
- **Các đầu việc chính:**
  1. Module 2: Xây dựng API ban hành thông báo khẩn/thường, tích hợp Expo Push Notification Server.
  2. Mobile Module 2: Giao diện Hộp thư thông báo, xem chi tiết văn bản đính kèm, bấm "Xác nhận đã đọc".
  3. Module 1: Xây dựng API bảng tin, phân trang vô tận, bình luận và thả tim.
  4. Mobile Module 1: Giao diện Feed mạng xã hội nội bộ tổ dân phố, form đăng bài có chọn ảnh từ thư viện.
- **Tiêu chuẩn hoàn thành (DoD):**
  - Khi tổ trưởng đăng thông báo, điện thoại cư dân rung chuông nhận push notification; cư dân đọc và tương tác trên bảng tin mượt mà.

---

### Giai đoạn 4: Quản lý Thu chi, Quỹ vận động & VietQR (Module 4)
- **Mục tiêu:** Minh bạch hóa tài chính công dân, số hóa quy trình thu phí và đóng góp quỹ.
- **Các đầu việc chính:**
  1. Backend: API tạo chiến dịch vận động quỹ (bắt buộc/tự nguyện), ghi nhận biên lai thu, lập phiếu chi.
  2. Tích hợp thuật toán sinh mã VietQR động theo chuẩn Napas với số tiền và nội dung chuyển khoản tự động điền sẵn mã hộ.
  3. Mobile: Giao diện danh sách các quỹ đang vận động, biểu đồ tiến độ thu minh bạch.
  4. Mobile: Màn hình nộp tiền hiển thị mã VietQR để cư dân quét qua app ngân hàng; tra cứu biên lai đã nộp.
- **Tiêu chuẩn hoàn thành (DoD):**
  - Báo cáo số dư quỹ hiển thị minh bạch cho toàn bộ cư dân; cư dân nộp tiền thuận tiện qua mã QR.

---

### Giai đoạn 5: Bản đồ tiện ích & Phản ánh hiện trường, SOS (Module 5 & Module 6)
- **Mục tiêu:** Nâng cao chất lượng đô thị và cung cấp công cụ phản ứng khẩn cấp.
- **Các đầu việc chính:**
  1. Module 5: Tích hợp thư viện bản đồ số trên mobile, hiển thị ranh giới tổ dân phố và các điểm cứu hỏa, nhà văn hóa, trạm y tế.
  2. Module 6: Xây dựng tính năng Gửi phản ánh hiện trường (chụp ảnh vứt rác, lấn chiếm lòng lề đường, hỏng đèn chiếu sáng) kèm trạng thái xử lý theo thời gian thực.
  3. Tính năng Báo động khẩn cấp (SOS): Kênh WebSocket phát tín hiệu cảnh báo hỏa hoạn/an ninh đến toàn bộ thành viên trong tổ.
- **Tiêu chuẩn hoàn thành (DoD):**
  - Phản ánh của cư dân được gửi đến tổ trưởng xử lý; nút SOS kích hoạt chuông cảnh báo tức thời.

---

### Giai đoạn 6: Kiểm thử toàn diện, Đóng gói APK & Thử nghiệm thực địa
- **Mục tiêu:** Kiểm toán chất lượng, bảo mật lần cuối và bàn giao bản build cài đặt.
- **Các đầu việc chính:**
  1. Kiểm thử tải và kiểm thử bảo mật (Penetration testing cơ bản, rà soát PII leakage).
  2. Build file APK Android hoàn chỉnh để cài đặt thử nghiệm trên thiết bị thật.
  3. Bàn giao tài liệu hướng dẫn sử dụng cho Ban điều hành và Cư dân.

