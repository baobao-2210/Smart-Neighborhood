# BÁO CÁO KIỂM TOÁN & TÁI CẤU TRÚC DỰ ÁN (PROJECT AUDIT)
## SMART NEIGHBORHOOD – ỨNG DỤNG QUẢN LÝ TỔ DÂN PHỐ

- **Ngày kiểm toán:** 26/11/2026
- **Vai trò:** Senior Software Architect, Senior React Native Developer & Senior Backend Engineer
- **Phạm vi:** Toàn bộ source code tại `d:\HKDN_MOBLIEAPP\menager_small` và thiết kế giao diện trên Google Stitch (`Smart Neighborhood Community App` - ID `13750075530078314153`).
- **Quy chuẩn trạng thái:** Phân biệt rõ: *Đã tồn tại trong source code*, *Đã hoàn thành*, *Chưa hoàn thành*, *Cần sửa*, *Cần loại bỏ*, *Đề xuất mới*.

---

## 1. KIỂM TOÁN HIỆN TRẠNG SOURCE CODE & CÔNG NGHỆ

### 1.1. Kiến trúc tổng thể hiện tại
- **Mô hình:** Monorepo sử dụng `pnpm workspace` (`apps/mobile`, `apps/backend`, `packages/shared`), Docker Compose (`PostgreSQL 16-alpine`).
- **Frontend Mobile (`apps/mobile`):**
  - **Đã tồn tại:** Expo SDK 52, Expo Router v4 (`app/_layout.tsx`, `app/(tabs)/_layout.tsx`), React Native `0.76.9`, TypeScript `strict: true`, TanStack Query v5, Zustand v5, Axios, `expo-image-picker`, `expo-secure-store`.
  - **Design System hiện có:** `src/constants/theme.ts`, `AppText`, `AppButton`, `AppCard`, `Avatar`, `Badge`, `EmptyState`, `ModulePlaceholder`, `FeedPostCard`.
- **Backend (`apps/backend`):**
  - **Đã tồn tại:** NestJS `10.4.x`, Prisma ORM `5.22.0`, `class-validator`, `class-transformer`, `TransformInterceptor`, `DatabaseModule` (`PrismaService`), `FeedModule` (`feed.controller.ts`, `feed.service.ts`, `feed.dto.ts`).
  - **Chưa hoàn thành:** Chưa có `AuthModule` (JWT, Guards), `UsersModule`, `ResidentsModule`, `NotificationModule`, `MapModule`, `ConnectModule` (Chat/Socket.IO), `UploadModule`, Swagger/OpenAPI, Rate Limiting (`@nestjs/throttler`), Logging, Exception Filter chuẩn.
- **Database (`apps/backend/prisma/schema.prisma`):**
  - **Đã tồn tại:** Schema định nghĩa 12 models (`ToDanPho`, `User`, `DeviceToken`, `Household`, `Resident`, `Post`, `PostMedia`, `Comment`, `PostReaction`, `Announcement`, `AnnouncementReadReceipt`, `Event`, `EventAttendee`, `FundCampaign`, `ContributionRecord`, `ExpenseRecord`, `CommunityPlace`, `CommunityRequest`, `AuditLog`).
  - **Chưa hoàn thành:** Chưa chạy migration thực tế (`prisma/migrations/` mới có `.gitkeep`), Docker PostgreSQL chưa bật.

---

## 2. PHÂN LOẠI TRẠNG THÁI THEO MODULE & THÀNH PHẦN

| Thành phần / Module | Trạng thái chi tiết | Đánh giá |
| :--- | :--- | :--- |
| **Module 1: Bảng tin cộng đồng** | Đã tồn tại UI (`feed/index.tsx`, `[id].tsx`, `create.tsx`) & Backend `FeedModule` (CRUD, reaction, comment, pin) | **Đang làm dở / Cần sửa:** Thiếu luồng Báo cáo sự cố (Reports), theo dõi trạng thái xử lý phản ánh, phân quyền bài viết công khai/riêng tư và chưa kết nối Auth JWT thật (đang dùng header giả lập `x-user-id` & `feedMockStore`). |
| **Module 2: Thông báo & Sự kiện** | Đã tồn tại màn hình chờ `notice/index.tsx`, model `Announcement`, `Event` trong Prisma | **Chưa hoàn thành:** Chưa có Backend `NotificationModule`, chưa có Push Notification (FCM/Expo Push), chưa có UI danh sách thông báo & lịch sự kiện. |
| **Module 3: Quản lý cư dân** | Đã tồn tại màn hình chờ `residents/index.tsx`, model `Household`, `Resident` trong Prisma | **Chưa hoàn thành:** Chưa có Backend `ResidentsModule`, chưa có UI quản lý hộ gia đình/nhân khẩu/chủ hộ và kiểm soát PII. |
| **Module 4 (Cũ): Thu chi & Đóng góp** | Đã tồn tại `apps/mobile/app/(tabs)/finance/index.tsx`, tab trong `(tabs)/_layout.tsx`, `FundCampaign`/`ContributionRecord`/`ExpenseRecord` trong `schema.prisma`, enums trong `packages/shared` | **CẦN LOẠI BỎ HOÀN TOÀN:** Không còn nằm trong phạm vi sản phẩm 6 module mới. |
| **Module 4 (Mới): Bản đồ cộng đồng** | Đã tồn tại màn hình chờ `map/index.tsx`, model `CommunityPlace` | **Cần sửa & Đề xuất mới:** Chưa có UI bản đồ (`react-native-maps`), cần mở rộng để hiển thị Phản ánh công khai & Sự kiện trên bản đồ, ẩn vị trí chính xác của phản ánh riêng tư và ẩn PII người gửi. |
| **Module 5 (Mới): Kết nối cộng đồng** | Đã tồn tại màn hình chờ `connect/index.tsx` | **Chưa hoàn thành & Cần sửa:** Trước đây định hướng làm Phản ánh/SOS; nay tái cấu trúc thành **Nhắn tin 1-1, Nhắn tin nhóm, Trao đổi Cư dân–Cán bộ realtime (Socket.IO), gửi ảnh/file và kiểm duyệt nội dung**. |
| **Module 6 (Mới): Tài khoản cá nhân** | Đã tồn tại `profile/index.tsx` (chỉ có Demo Role Switcher) | **Chưa hoàn thành:** Thiếu Đăng ký/Đăng nhập JWT, Hồ sơ cá nhân, Hộ gia đình của tôi, Lịch sử bài đăng/phản ánh/hoạt động, Cài đặt thông báo & quyền riêng tư, Đổi mật khẩu, Yêu cầu xóa tài khoản. |

---

## 3. KIỂM KÊ CÁC THÀNH PHẦN BỊ ẢNH HƯỞNG KHI LOẠI BỎ "QUẢN LÝ THU CHI & ĐÓNG GÓP"

Qua rà soát toàn bộ source code hiện có, các vị trí sau chứa tham chiếu đến Finance / Thu chi / Đóng góp và **cần loại bỏ ở giai đoạn triển khai tiếp theo**:

1. **Frontend Mobile (`apps/mobile`):**
   - `apps/mobile/app/(tabs)/finance/index.tsx` (màn hình placeholder Module 4 cũ) & thư mục `apps/mobile/app/(tabs)/finance/`.
   - `apps/mobile/app/(tabs)/_layout.tsx` (dòng 54: `<Tabs.Screen name="finance/index" ... />`).
2. **Backend (`apps/backend`):**
   - Thư mục rỗng `apps/backend/src/modules/finance/.gitkeep`.
   - `apps/backend/prisma/schema.prisma`:
     - Enums: `FundType` (dòng 55), `PaymentStatus` (dòng 60), `PaymentMethod` (dòng 66).
     - Quan hệ trên `ToDanPho`: `fundCampaigns FundCampaign[]` (dòng 109).
     - Quan hệ trên `Household`: `contributions ContributionRecord[]` (dòng 179).
     - Models: `FundCampaign` (dòng 339), `ContributionRecord` (dòng 361), `ExpenseRecord` (dòng 381).
     - Comment mẫu ở `AuditLog`: `resource` comment `FINANCE` (dòng 452).
3. **Shared Package (`packages/shared`):**
   - `packages/shared/src/types/index.ts`: các enum `FundType` (dòng 46), `PaymentStatus` (dòng 51), `PaymentMethod` (dòng 57).
4. **Google Stitch Screens:**
   - Màn hình `Dịch Vụ & Đóng Phí Cư Dân` (`49f5e00aa926404093571939d59ad57e` & `5dc2b83a5ed3436db6790263cdcf7c1b`) và `Đóng Quỹ Dân Cư` (`deb0167c8b6945c7ba4969bd746ebe12`): Cần loại bỏ phần đóng phí/quỹ.
5. **Tài liệu cũ (`docs/project-audit/`):**
   - Toàn bộ 7 file kiểm toán cũ đề cập mô hình 7 module (có Finance). Bộ tài liệu mới tại `docs/restructure/` thay thế hoàn toàn làm chuẩn thiết kế chính thức.

---

## 4. CÁC VẤN ĐỀ KỸ THUẬT & RỦI RO PHÁT HIỆN TRONG CODE HIỆN TẠI

1. **Lỗ hổng bảo mật nghiêm trọng ở `FeedController` (Cần sửa):**
   - `apps/backend/src/modules/feed/feed.controller.ts` đang tin tưởng tuyệt đối HTTP Headers (`x-user-id`, `x-todanpho-id`, `x-user-role`) do client tự gửi lên. Bất kỳ ai cũng có thể giả mạo header `x-user-role: TO_TRUONG` để ghim hoặc xóa bài viết. Phải thay thế bằng `JwtAuthGuard` + `RolesGuard` + `NeighborhoodScopeGuard`.
2. **Thiếu đồng bộ bảng màu với Google Stitch (Cần sửa):**
   - `apps/mobile/src/constants/theme.ts` đang dùng Primary `#0D47A1`, Background `#F5F7FA`; trong khi thiết kế Google Stitch `Smart Neighborhood Community App` quy định Primary `#2563eb` / `#004ac6`, Secondary `#0d9488`, Background `#faf8ff`, On-Background `#131b2e`, Roundness `8px`. Cần đồng bộ token màu từ Stitch.
3. **Navigation quá tải trên Bottom Tab Bar (Cần sửa):**
   - Đang đặt 6 tab dưới đáy màn hình, gây chật chội và chưa phân tách quyền Cư dân vs Cán bộ.
4. **Chưa có xử lý lỗi tập trung & Swagger trên Backend (Chưa hoàn thành):**
   - Thiếu `GlobalExceptionFilter`, `LoggerService`, `ConfigModule` validation và `@nestjs/swagger`.

