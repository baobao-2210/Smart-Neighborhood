# BẢNG MAPPING GOOGLE STITCH → REACT NATIVE → MODULE → API
## & CẤU TRÚC NAVIGATION ĐỀ XUẤT

---

## 1. DESIGN SYSTEM TOKENS TỪ GOOGLE STITCH (`Smart Neighborhood Community App`)

Để giữ nguyên bản sắc giao diện đã thiết kế trên Google Stitch (Project ID: `13750075530078314153`), cần đồng bộ lại `apps/mobile/src/constants/theme.ts` theo bảng màu và typography gốc từ Stitch:

| Token | Giá trị từ Google Stitch | Trạng thái hiện tại trong `theme.ts` | Hành động |
| :--- | :--- | :--- | :--- |
| `primary` | `#2563eb` / `#004ac6` | `#0D47A1` | **Cập nhật** sang `#2563EB` |
| `secondary` | `#0d9488` / `#006a61` | `#1565C0` | **Cập nhật** sang `#0D9488` |
| `tertiary` | `#bc4800` / `#943700` | `#B71C1C` | **Cập nhật** sang `#BC4800` |
| `background` / `surface` | `#faf8ff` | `#F5F7FA` / `#FFFFFF` | **Cập nhật** sang `#FAF8FF` |
| `surfaceContainerLowest` | `#ffffff` | `#FFFFFF` | Giữ nguyên cho Card |
| `surfaceContainerLow` | `#f2f3ff` | `#EEF2F6` | **Cập nhật** sang `#F2F3FF` |
| `textPrimary` (`on_background`) | `#131b2e` | `#1A1D20` | **Cập nhật** sang `#131B2E` |
| `roundness` | `8px` (`ROUND_EIGHT`) | `12px` / `16px` | Chuẩn hóa `RADIUS.md = 8`, `RADIUS.lg = 12` |
| `fontFamily` | `Inter` | System font | Tích hợp `Inter` (hoặc giữ fallback chuẩn) |

---

## 2. BẢNG MAPPING MÀN HÌNH GOOGLE STITCH

| Stitch Screen ID | Tên màn hình trên Google Stitch | React Native Screen (Expo Router) | Module | API sử dụng | Trạng thái / Ghi chú |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `b9e4aba6...` & `80507f45...` | **Trang Chủ Cư Dân - Tổ Dân Phố Số** | `app/(tabs)/feed/index.tsx` (Bảng tin & Cảnh báo ghim) | M1 + M2 | `GET /posts`, `GET /announcements?isPinned=true` | **Giữ nguyên layout**; tích hợp thẻ thông báo ghim ở đầu bảng tin. |
| `49f5e00a...` & `5dc2b83a...` | **Dịch Vụ & Đóng Phí Cư Dân** | **LOẠI BỎ MÀN HÌNH ĐÓNG PHÍ** | ~~Thu chi~~ | *Không dùng* | **Cần loại bỏ toàn bộ phần Đóng phí / Thanh toán / Quỹ.** Các lối tắt tiện ích phi tài chính (nếu có) chuyển vào mục Tiện ích/Quản lý. |
| `f810551c...` & `f4e1dd6e...` | **Phản Ánh & Kiến Nghị Đô Thị** | `app/(tabs)/feed/reports.tsx` (hoặc tab con Phản ánh trong M1) & `[id].tsx` | M1 | `GET /reports`, `GET /reports/:id`, `PATCH /reports/:id/status` | **Giữ nguyên UI**, kết nối dữ liệu trạng thái xử lý thật. |
| `dfd92b0b...` | **Gửi Phản Ánh Dân Sinh (Camera & GPS)** | `app/report/create.tsx` (Modal) | M1 + M4 | `POST /upload`, `POST /reports` | **Giữ nguyên UI**, thêm chọn chế độ `PUBLIC` / `PRIVATE` và ẩn vị trí nếu `PRIVATE`. |
| `5f751b51...` & `5d3645e3...` | **Hồ Sơ Cư Dân & Hộ Khẩu Số** | `app/(tabs)/profile/household.tsx` (Cư dân) & `app/manage/residents/` (Cán bộ) | M3 + M6 | `GET /users/me/household`, `GET /households`, `GET /residents` | **Giữ nguyên UI**, tách quyền xem hộ cá nhân vs quản lý toàn tổ. |
| *(Chưa có trên Stitch)* | **Thông báo & Lịch sự kiện** | `app/(tabs)/notice/index.tsx` & `events/[id].tsx` | M2 | `GET /announcements`, `GET /events`, `POST /events/:id/register` | **Đề xuất bổ sung** theo cùng Design Theme `#2563EB` của Stitch. |
| *(Chưa có trên Stitch)* | **Bản đồ Cộng đồng** | `app/(tabs)/map/index.tsx` | M4 | `GET /map/markers`, `GET /map/reports/:id` | **Đề xuất bổ sung** (chỉ hiện phản ánh `PUBLIC` & sự kiện). |
| *(Chưa có trên Stitch)* | **Kết nối Cộng đồng (Chat)** | `app/(tabs)/connect/index.tsx` & `chat/[id].tsx` | M5 | `GET /conversations`, `POST /conversations/:id/messages`, Socket.IO | **Đề xuất bổ sung** theo cùng Design Theme của Stitch. |
| *(Chưa có trên Stitch)* | **Đăng nhập / Đăng ký / Cài đặt** | `app/(auth)/login.tsx`, `register.tsx`, `app/(tabs)/profile/index.tsx` | M6 | `POST /auth/login`, `GET /users/me`, `PATCH /users/me/settings` | **Đề xuất bổ sung** đồng bộ phong cách Stitch. |

---

## 3. CẤU TRÚC NAVIGATION ĐỀ XUẤT (KHÔNG ĐƯA CẢ 6 MODULE VÀO TAB BAR)

Áp dụng nguyên tắc mobile UX: Bottom Tab Bar chỉ chứa **4 hoặc 5 khu vực sử dụng thường xuyên nhất**, phần quản trị dành cho Cán bộ/Tổ trưởng chỉ hiển thị theo quyền hạn (`LEADER`, `STAFF`, `SUPER_ADMIN`):

### Bottom Tab Navigation (5 Tabs cố định cho mọi người dùng)
1. **`feed` — Bảng tin** *(Module 1)*: Bài viết cộng đồng, cảnh báo ghim, bộ lọc Phản ánh sự cố, nút tạo bài/phản ánh.
2. **`notice` — Thông báo** *(Module 2)*: Thông báo chính thức (có badge chưa đọc), lịch sự kiện & đăng ký tham gia.
3. **`map` — Bản đồ** *(Module 4)*: Bản đồ phản ánh công khai, vị trí sự kiện & điểm sinh hoạt cộng đồng.
4. **`connect` — Kết nối** *(Module 5)*: Nhắn tin 1-1, nhóm tổ/ngõ, trao đổi với cán bộ phụ trách.
5. **`profile` — Cá nhân** *(Module 6 + Cổng Module 3)*:
   - Với **Cư dân (`RESIDENT`)**: Hồ sơ cá nhân, **Hộ gia đình của tôi**, Lịch sử bài đăng & phản ánh, Cài đặt thông báo/riêng tư, Đổi mật khẩu, Yêu cầu xóa tài khoản.
   - Với **Tổ trưởng / Cán bộ / Admin (`LEADER`, `STAFF`, `SUPER_ADMIN`)**: Hiển thị thêm khu vực **"Quản lý Tổ dân phố"** ngay trong màn hình Cá nhân (hoặc Header Shortcut) để mở:
     - *Quản lý Cư dân & Hộ khẩu* (`app/manage/residents/index.tsx` - Module 3)
     - *Điều phối & Xử lý Phản ánh* (`app/manage/reports/index.tsx` - Module 1/4)
     - *Phát hành Thông báo & Tạo Sự kiện* (`app/manage/announcements/create.tsx` - Module 2)
     - *Kiểm duyệt Nội dung Chat* (`app/manage/moderation/index.tsx` - Module 5)

**Ưu điểm cấu trúc Navigation này:**
- Không có màn hình thừa/chết cho Cư dân; Cư dân không bao giờ thấy menu quản trị không thuộc quyền mình.
- Tab Bar thoáng, đúng 5 tab chuẩn mobile, dễ thao tác cho cả người lớn tuổi.
- Vẫn truy cập đầy đủ toàn bộ 6 module trong tối đa 1–2 lần chạm.

