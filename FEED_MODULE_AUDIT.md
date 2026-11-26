# FEED MODULE AUDIT (`FEED_MODULE_AUDIT.md`)

**Ngày audit:** 2026-11-26  
**Phạm vi:** React Native / Expo (`apps/mobile`), Shared Contracts (`packages/shared`), NestJS Backend (`apps/backend`), Prisma Schema (`apps/backend/prisma/schema.prisma`), Socket.IO & Google Stitch UI (`projects/15749099382889688163`).

---

## 1. Tổng quan hiện trạng

### 1.1. Database & Prisma Schema (`apps/backend/prisma/schema.prisma`)
- **Đã có:**
  - `Post` (`id`, `neighborhoodId`, `authorId`, `category`, `visibility`, `title`, `content`, `isPinned`, `isOfficial`, `locationName`, `latitude`, `longitude`, `deletedAt`).
  - `Comment` (đã hỗ trợ `parentId` và quan hệ tự tham chiếu `replies`).
  - `Reaction` (`LIKE`, `HEART`, `CLAP`, unique `[postId, userId]`).
  - `Report` (`id`, `neighborhoodId`, `reporterId`, `assignedToId`, `category`, `visibility`, `title`, `description`, `status`, `latitude`, `longitude`, `addressText`).
  - `ReportStatusHistory` (`reportId`, `changedById`, `fromStatus`, `toStatus`, `note`, `createdAt`).
  - `Attachment`, `Notification`, `AuditLog`.
- **Còn thiếu / Cần nâng cấp (P01):**
  1. Chưa có liên kết 1-1 giữa `Post` và `Report` (`postId` trên `Report` hoặc `postType: NORMAL | INCIDENT` trên `Post`) để tạo bài viết + phản ánh trong **cùng 1 giao dịch (`$transaction`)** mà không tạo 2 bản ghi trùng lặp.
  2. `ReportStatus` hiện chỉ có `PENDING | IN_PROGRESS | RESOLVED | REJECTED` — thiếu `NEW` và `ACCEPTED`.
  3. `Report` thiếu `code` (mã phản ánh như `PA-2026-0001`) và `priority` (`NORMAL | HIGH | URGENT`).
  4. Thiếu bảng `PostEditHistory` (lưu lịch sử chỉnh sửa nội dung bài viết) và `PostReport` (báo cáo nội dung bài viết vi phạm).

### 1.2. Backend (`apps/backend/src/modules/feed` & `reports` & `connect`)
- **Đã có:**
  - `FeedController` (`GET /api/v1/posts`, `GET /api/v1/posts/:id`, `POST /api/v1/posts`, `POST /api/v1/posts/:id/reactions`, `POST /api/v1/posts/:id/comments`, `PATCH /api/v1/posts/:id/pin`, `DELETE /api/v1/posts/:id`).
  - `ReportsController` (`GET /api/v1/reports`, `POST /api/v1/reports`, `GET /api/v1/reports/:id`, `PATCH /api/v1/reports/:id/status`).
  - `UploadController` (`POST /api/v1/upload`).
  - `ChatGateway` (`/ws/chat` bằng Socket.IO).
- **Còn thiếu / Lỗ hổng nghiệp vụ (P02–P03 & P08):**
  1. Chưa có `PATCH /api/v1/posts/:id` (chỉnh sửa bài viết bởi tác giả + ghi `PostEditHistory`).
  2. Chưa có `POST /api/v1/posts/:id/report` (báo cáo bài viết vi phạm).
  3. Chưa có tạo bài viết sự cố trong `$transaction` (tạo đồng thời `Post` + `Report` + `Attachment` + `ReportStatusHistory` + `Notification` cho cán bộ).
  4. `FeedService.getPosts`: nếu `visibility = PRIVATE`, cư dân tác giả cần xem được bài riêng tư của chính mình, nhưng người khác không được phép thấy — và tuyệt đối không lộ tọa độ/ảnh riêng tư cho người không có quyền.
  5. `ReportsService.updateStatus`: chưa kiểm tra **State Machine** chuyển trạng thái hợp lệ (`NEW -> PENDING -> ACCEPTED -> IN_PROGRESS -> RESOLVED / REJECTED`), chưa có endpoint riêng `accept` và `assign`, chưa gửi `Notification` cho người gửi/người phụ trách khi đổi trạng thái, và chưa chặn xóa bài viết khi phản ánh đang xử lý (`ACCEPTED` / `IN_PROGRESS`).
  6. Chưa có Realtime Gateway phát sự kiện `post.*` và `incident.*` kèm kiểm tra quyền phòng (`neighborhood:<id>` vs `user:<id>` cho phản ánh riêng tư).

### 1.3. Frontend (`apps/mobile`)
- **Đã có:**
  - Giao diện **Espresso Dark & Vibrant** (Nâu lợt `#241D19` / `#302722` + Cyan `#22D3EE`) theo Stitch (`projects/15749099382889688163`).
  - Màn hình tạo bài hợp nhất [create.tsx](file:///d:/HKDN_MOBLIEAPP/menager_small/apps/mobile/app/(tabs)/feed/create.tsx) với Camera, Thư viện ảnh, xem trước & xóa ảnh, GPS & `LocationPickerModal`.
  - Màn hình chi tiết bài viết [id.tsx](file:///d:/HKDN_MOBLIEAPP/menager_small/apps/mobile/app/(tabs)/feed/[id].tsx) hỗ trợ reaction và bình luận.
- **Còn thiếu (P04–P08):**
  1. Bảng tin chính (`feed/index.tsx`): cần có tab/chế độ xem rõ ràng giữa **Bảng tin** và **Phản ánh sự cố** (không tạo màn hình đăng bài riêng, vẫn dùng chung 1 nút/màn hình `create.tsx`).
  2. `create.tsx`: cần gọi 1 API hợp nhất (`POST /api/v1/posts`) khi đăng bài thường hoặc bài sự cố, có chọn quyền riêng tư (`PUBLIC` / `PRIVATE`) và mức độ khẩn thiết.
  3. `[id].tsx`: cần bổ sung **trả lời bình luận** (`parentId`), **chỉnh sửa bài viết**, **báo cáo bài viết**, và **hiển thị thẻ Phản ánh + Lịch sử xử lý (`ReportStatusHistory`) + nút Tiếp nhận / Phân công / Cập nhật trạng thái** cho cán bộ.
  4. Chưa kết nối Socket.IO client cho module Bảng tin để cập nhật realtime.
