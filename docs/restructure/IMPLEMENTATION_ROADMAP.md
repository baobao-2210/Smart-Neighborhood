# LỘ TRÌNH TRIỂN KHAI SAU KIỂM TOÁN (IMPLEMENTATION ROADMAP)
## SMART NEIGHBORHOOD – 6 MODULE & BACKEND CHÍNH QUY

> **Lưu ý:** Giai đoạn hiện tại là **AUDIT → ANALYSIS → DESIGN → DOCUMENTATION**. Toàn bộ các bước code bên dưới chỉ bắt đầu sau khi bạn xác nhận phê duyệt thiết kế.

---

## GIAI ĐOẠN 1: DỌN DẸP TÀI CHÍNH, CẬP NHẬT DATABASE & BACKEND CORE
**Mục tiêu:** Loại bỏ hoàn toàn dấu vết module Thu chi, thiết lập Backend NestJS chuẩn 4 lớp và chạy PostgreSQL + Prisma Migration an toàn.
1. **Dọn dẹp phạm vi cũ:**
   - Xóa `apps/mobile/app/(tabs)/finance/`, `apps/backend/src/modules/finance/`, tab `finance/index` trong `(tabs)/_layout.tsx`, enum `FundType`/`PaymentStatus`/`PaymentMethod` trong `packages/shared`.
2. **Database & Migration:**
   - Cập nhật `apps/backend/prisma/schema.prisma` theo `DATABASE_DESIGN.md` (21 bảng cho 6 module, multi-tenant `neighborhoodId`, soft delete `deletedAt`).
   - Khởi động Docker PostgreSQL 16, chạy `npx prisma migrate dev --name init_6_modules` và seed dữ liệu tổ dân phố + tài khoản mẫu (Super Admin, Tổ trưởng, Cán bộ, Cư dân).
3. **Backend Core Infrastructure:**
   - Thiết lập `ConfigModule` (env validation), `Helmet`, `CORS`, `ThrottlerGuard`, `AllExceptionsFilter`, `AuditModule`, `UploadModule` (lưu ảnh/file an toàn) và `@nestjs/swagger`.

---

## GIAI ĐOẠN 2: XÁC THỰC, PHÂN QUYỀN RBAC & MODULE 6 (TÀI KHOẢN CÁ NHÂN)
**Mục tiêu:** Thay thế cơ chế giả lập header bằng bảo mật JWT + RBAC thật trên Backend & Mobile.
1. **Backend:** `AuthModule` (Register, Login, Refresh Token Rotation, Change Password), `JwtAuthGuard`, `RolesGuard`, `NeighborhoodScopeGuard`, `UsersModule` (Profile, Settings, Activity History, AccountDeletionRequest).
2. **Mobile:** Đồng bộ Design System tokens từ Google Stitch (`#2563EB`, `#0D9488`, `#FAF8FF`, `#131B2E`), màn hình Login/Register, lưu Refresh Token bằng `expo-secure-store`, màn hình Cá nhân (`profile`) với đầy đủ Lịch sử, Cài đặt thông báo/riêng tư và Yêu cầu xóa tài khoản.

---

## GIAI ĐOẠN 3: MODULE 3 (QUẢN LÝ CƯ DÂN) & CẬP NHẬT NAVIGATION
**Mục tiêu:** Xây dựng nền tảng dữ liệu hộ gia đình, nhân khẩu và hoàn thiện Bottom Tab 5 tab + Cổng quản lý theo vai trò.
1. **Backend:** `ResidentsModule` (CRUD Hộ gia đình, Thành viên hộ, Chủ hộ, Trạng thái cư trú, tìm kiếm/lọc, masking CCCD theo quyền).
2. **Mobile:** Cập nhật `(tabs)/_layout.tsx` theo cấu trúc 5 tab (`feed`, `notice`, `map`, `connect`, `profile`), màn hình `Hộ gia đình của tôi` (cho Cư dân) và `Quản lý cư dân` (cho Tổ trưởng/Cán bộ theo thiết kế Stitch `5f751b51...`).

---

## GIAI ĐOẠN 4: HOÀN THIỆN MODULE 1 (BẢNG TIN & PHẢN ÁNH) & MODULE 4 (BẢN ĐỒ)
**Mục tiêu:** Nâng cấp `FeedModule` hiện tại lên chuẩn bảo mật JWT, bổ sung luồng Phản ánh sự cố (`Reports`) và kết nối sang Bản đồ cộng đồng.
1. **Backend:** Refactor `FeedController` (bỏ header giả lập, dùng `JwtAuthGuard`), thêm `ReportsModule` (`PUBLIC`/`PRIVATE`, `ReportStatusHistory`) và `MapModule` (chỉ trả phản ánh `PUBLIC` + sự kiện, ẩn hoàn toàn PII người gửi).
2. **Mobile:** Nâng cấp tab Bảng tin theo màn hình Stitch `Trang Chủ Cư Dân`, thêm màn hình *Phản ánh & Kiến nghị* (`f810551c...`), *Gửi phản ánh Camera & GPS* (`dfd92b0b...`) và *Bản đồ cộng đồng* (`react-native-maps`).

---

## GIAI ĐOẠN 5: MODULE 2 (THÔNG BÁO & SỰ KIỆN)
**Mục tiêu:** Triển khai kênh thông báo chính thống, lịch sự kiện và Push Notification qua FCM/Expo.
1. **Backend:** `AnnouncementsModule` (ghim, đọc, thống kê đã đọc), `EventsModule` (lịch, đăng ký tham gia), `NotificationsModule` (FCM / Expo Push).
2. **Mobile:** Giao diện danh sách thông báo quan trọng, chi tiết thông báo xác nhận đã đọc, lịch sự kiện cộng đồng & nút đăng ký tham gia.

---

## GIAI ĐOẠN 6: MODULE 5 (KẾT NỐI CỘNG ĐỒNG - CHAT REALTIME) & KIỂM THỬ TOÀN DIỆN
**Mục tiêu:** Hoàn thiện nhắn tin 1-1, nhóm, Socket.IO realtime, kiểm duyệt và kiểm thử bảo mật toàn hệ thống.
1. **Backend:** `ChatModule` + `ChatGateway` (Socket.IO với `WsJwtGuard`), báo cáo & kiểm duyệt tin nhắn vi phạm.
2. **Mobile:** Danh sách hội thoại, phòng chat realtime hỗ trợ gửi ảnh/tệp đính kèm, báo cáo tin nhắn.
3. **Kiểm thử & Đóng gói:** Kiểm thử E2E phân quyền 4 vai trò, kiểm tra chống rò rỉ dữ liệu liên tổ và PII, build kiểm thử trên máy ảo Android.

