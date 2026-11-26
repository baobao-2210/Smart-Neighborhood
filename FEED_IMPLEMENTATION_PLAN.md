# FEED IMPLEMENTATION PLAN (`FEED_IMPLEMENTATION_PLAN.md`)

Kế hoạch triển khai Module Bảng tin & Phản ánh sự cố theo đúng 10 giai đoạn (`P00` → `P09`), giữ nguyên giao diện Espresso Dark & Vibrant trên Google Stitch và toàn bộ Backend NestJS + Prisma + Supabase hiện tại.

---

## Lộ trình thực hiện

- **P00 – Audit (Hoàn thành):** Đọc toàn bộ codebase, đối chiếu Google Stitch (`projects/15749099382889688163`), lập `FEED_MODULE_AUDIT.md` và `FEED_IMPLEMENTATION_PLAN.md`.
- **P01 – Database & API Contract:**
  - Cập nhật `schema.prisma`: thêm `PostType` (`NORMAL | INCIDENT`), `ReportPriority` (`NORMAL | HIGH | URGENT`), mở rộng `ReportStatus` (`NEW`, `PENDING`, `ACCEPTED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`), thêm `Report.code` & `Report.postId` (`@unique`), thêm `PostEditHistory` và `PostReport`.
  - Chạy `prisma migrate dev` và `prisma generate`.
  - Cập nhật `packages/shared/src/types/feed.ts` & `index.ts` đồng bộ enum/interface cho cả Backend & Mobile.
- **P02 – Backend Bài viết (`FeedModule`):**
  - Hợp nhất `createPost` trong `$transaction`: nếu là `INCIDENT` thì tạo đồng thời `Post`, `Report` (sinh mã `PA-YYYY-XXXX`), `ReportStatusHistory` (`NEW`), `Attachment` và `Notification` cho cán bộ phụ trách.
  - Bổ sung `PATCH /api/v1/posts/:id` (kiểm tra tác giả, lưu `PostEditHistory`, không cho cán bộ sửa nội dung gốc của cư dân).
  - Bổ sung `POST /api/v1/posts/:id/report` (báo cáo bài viết vi phạm).
  - Bảo vệ quyền riêng tư trong `getPosts` / `getPostById`: ẩn tọa độ/ảnh/nội dung bài `PRIVATE` với người không phải tác giả hoặc cán bộ; chặn xóa bài nếu phản ánh đang xử lý (`ACCEPTED` / `IN_PROGRESS`).
- **P03 – Backend Phản ánh (`ReportsModule`):**
  - Triển khai State Machine kiểm tra chuyển trạng thái hợp lệ:
    - `NEW` → `PENDING | ACCEPTED | REJECTED`
    - `PENDING` → `ACCEPTED | IN_PROGRESS | REJECTED`
    - `ACCEPTED` → `IN_PROGRESS | RESOLVED | REJECTED`
    - `IN_PROGRESS` → `RESOLVED | REJECTED`
  - Bổ sung `PATCH /api/v1/reports/:id/accept`, `PATCH /api/v1/reports/:id/assign`, `PATCH /api/v1/reports/:id/status` (chỉ `LEADER | STAFF | SUPER_ADMIN`).
  - Ghi `ReportStatusHistory` + gửi `Notification` cho các bên liên quan ở mọi lần chuyển trạng thái.
- **P04 – Frontend Bảng tin (`feed/index.tsx`):**
  - Hỗ trợ 2 khu vực rõ ràng: **Bảng tin** và **Phản ánh sự cố** (dùng chung 1 màn hình `create.tsx`), phân trang/tải thêm, lọc & tìm kiếm.
- **P05 – Frontend Tạo bài viết (`feed/create.tsx`):**
  - 1 màn hình duy nhất cho bài thường & bài sự cố (chủ động chọn danh mục sự cố, không tự đoán từ khóa), chọn quyền riêng tư (`PUBLIC` / `PRIVATE`), chụp ảnh/chọn thư viện/xem trước/xóa ảnh, chọn vị trí GPS/bản đồ.
- **P06 – Frontend Tương tác (`[id].tsx`, `FeedPostCard.tsx`):**
  - Like/unlike, bình luận & trả lời bình luận (`parentId`), chỉnh sửa bài viết (theo quyền tác giả), báo cáo bài viết, xóa bài theo quyền.
- **P07 – Frontend Quản lý phản ánh (`[id].tsx`, `feed/index.tsx`):**
  - Hiển thị mã phản ánh, trạng thái, lịch sử xử lý (`ReportStatusHistory`), nút **Tiếp nhận / Phân công / Cập nhật trạng thái** cho cán bộ.
- **P08 – Realtime (`FeedGateway` + Mobile Socket hook):**
  - Phát `post.created`, `post.updated`, `post.deleted`, `post.liked`, `post.commented`, `incident.created`, `incident.accepted`, `incident.assigned`, `incident.status_changed`, `incident.resolved` có kiểm tra quyền phòng/người dùng (không rò rỉ phản ánh `PRIVATE`).
- **P09 – Kiểm thử tích hợp:**
  - Chạy `tsc --noEmit`, lint, và bộ script kiểm thử E2E thật trên API + DB cho toàn bộ kịch bản PHẦN 8.

