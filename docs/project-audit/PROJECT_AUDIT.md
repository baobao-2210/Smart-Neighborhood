# BÁO CÁO KIỂM TOÁN DỰ ÁN (PROJECT AUDIT)
## HỆ THỐNG QUẢN LÝ TỔ DÂN PHỐ (NEIGHBORHOOD MANAGEMENT SYSTEM)

- **Ngày thực hiện:** 23/11/2026
- **Vai trò thực hiện:** Senior Mobile Architect & Senior Full-stack Developer
- **Phạm vi kiểm toán:** Toàn bộ mã nguồn, cấu hình môi trường, cơ sở dữ liệu, kiến trúc hệ thống và khả năng đáp ứng 7 phân hệ nghiệp vụ.
- **Thư mục làm việc:** `d:\HKDN_MOBLIEAPP\menager_small`
- **Mã văn bản:** `AUD-PROMPT-00-20261123`

---

## 1. TỔNG QUAN DỰ ÁN VÀ BỐI CẢNH KIỂM TOÁN

Dự án **Quản Lý Tổ Dân Phố** được định hướng là nền tảng chuyển đổi số toàn diện cấp cơ sở (tổ dân phố / khu phố / thôn bản), kết nối hai đối tượng mục tiêu:
1. **Ban điều hành Tổ dân phố (Tổ trưởng, Tổ phó, Cán bộ phụ trách, Cảnh sát khu vực):** Quản lý cư dân, hộ khẩu, thông báo, các khoản thu nộp/vận động quỹ, điều phối sự kiện và tiếp nhận phản ánh hiện trường.
2. **Cộng đồng dân cư (Cư dân, chủ hộ, nhân khẩu tạm trú):** Tiếp nhận tin tức chính thống, nhận thông báo sự kiện, tra cứu địa điểm dịch vụ công ích, thanh toán/đóng góp minh bạch và tương tác xây dựng đời sống văn minh đô thị.

Hệ thống được quy hoạch gồm **7 Module nghiệp vụ cốt lõi**:
1. **Module 1: Bảng tin cộng đồng (Community Feed)** - Tương tác đa chiều, bài viết, bình luận, hình ảnh đời sống.
2. **Module 2: Thông báo và sự kiện (Announcements & Events)** - Bản tin khẩn, thông báo hành chính, lịch sinh hoạt tổ, đăng ký tham gia.
3. **Module 3: Quản lý cư dân (Resident & Household Management)** - Sổ hộ khẩu số, nhân khẩu thường trú/tạm trú, dữ liệu CCCD/định danh.
4. **Module 4: Quản lý thu chi và đóng góp (Finance & Contributions)** - Quỹ vận động, phí vệ sinh, minh bạch hóa thu chi, hóa đơn/biên lai, VietQR.
5. **Module 5: Bản đồ cộng đồng (Community Map)** - Ranh giới hành chính tổ dân phố, điểm tiện ích, nhà sinh hoạt văn hóa, camera an ninh, điểm cứu hỏa/SOS.
6. **Module 6: Kết nối cộng đồng (Community Connect & Services)** - Phản ánh trật tự đô thị, ý kiến cử tri, giới thiệu dịch vụ tại chỗ, cứu hộ khẩn cấp.
7. **Module 7: Cá nhân và tài khoản (Profile & Account)** - Định danh tài khoản, phân quyền RBAC, cài đặt cá nhân, bảo mật dữ liệu.

---

## 2. HIỆN TRẠNG MÃ NGUỒN VÀ MÔI TRƯỜNG PHÁT TRIỂN (INVENTORY AUDIT)

### 2.1. Kiểm tra Workspace `d:\HKDN_MOBLIEAPP\menager_small`
- **Tình trạng vật lý:** Thư mục vừa được tạo mới (ngày 23/11/2026), hiện là **thư mục trống (Greenfield Project)**.
- **Mã nguồn hiện hữu:** 0 tệp tin, 0 thư mục con.
- **Git Repository:** Chưa khởi tạo (`fatal: not a git repository`). Chưa có `.gitignore`, chưa có commit lịch sử.
- **Đánh giá tình trạng kỹ thuật:** Dự án đang ở giai đoạn **Day-0 (Greenfield Architecture Stage)**. Đây là thời điểm vàng để thiết kế khung kiến trúc chuẩn mực (Clean Architecture / Feature-First Modular), tránh các khoản nợ kỹ thuật (Technical Debt) phát sinh từ các dự án kế thừa lộn xộn.

### 2.2. Kiểm tra Môi trường Máy chủ và Máy phát triển (Host Environment)
Qua lệnh rà soát hệ thống trực tiếp trên môi trường Windows phát triển:
- **Node.js:** `v22.20.0` (Đạt chuẩn LTS/Active hiện đại, hỗ trợ native fetch, ESM, buffer và crypto tân tiến).
- **Trình quản lý gói:**
  - `npm: 10.9.3` (Sẵn sàng).
  - `pnpm: 12.21.0` (Rất tốt, tối ưu hóa triệt để monorepo và caching dung lượng ổ cứng `D:\.pnpm-store`).
  - `yarn:` Chưa cài đặt toàn cục (khuyến nghị dùng `pnpm` làm standard package manager).
- **Docker:** `Docker version 29.8.1 (build 4a63305)` đã cài đặt trên máy. Docker Desktop service hiện đang dừng, cần kích hoạt khi triển khai container PostgreSQL/Redis.
- **Git CLI:** `git version 2.46.2.windows.1` (Sẵn sàng).
- **Nest CLI:** Chưa cài đặt global (nên dùng `npx @nestjs/cli` hoặc cấu hình qua scripts dev trong pnpm).
- **PostgreSQL CLI (`psql`):** Chưa có trong biến môi trường Windows PATH (sẽ kết nối thông qua Docker PostgreSQL container hoặc PostgreSQL client/Prisma Studio).

---

## 3. BẢNG PHÂN LOẠI TRẠNG THÁI HIỆN TẠI (STATUS AUDIT MATRIX)

Tuân thủ nghiêm ngặt quy tắc kiểm toán: *Phân biệt rõ: Đã hoàn thành, Đang triển khai, Chưa triển khai, Có lỗi*.

| Hạng mục kiểm toán | Thành phần | Trạng thái kỹ thuật | Tỷ lệ hoàn thành | Ghi chú / Nguyên nhân |
| :--- | :--- | :--- | :---: | :--- |
| **A. Frontend Mobile** | React Native + Expo | **Chưa triển khai** | 0% | Chưa có mã nguồn khởi tạo |
| | Expo Router v3/v4 | **Chưa triển khai** | 0% | Chưa cấu hình file-based routing |
| | Design System | **Chưa triển khai** | 0% | Chưa có Theme tokens, UI components |
| | State Management | **Chưa triển khai** | 0% | Chưa cấu hình TanStack Query, Zustand |
| | API Integration | **Chưa triển khai** | 0% | Chưa có Axios/Fetch client, Interceptors |
| | Cấu hình Android/iOS | **Chưa triển khai** | 0% | Chưa có `app.json`, bundle id, permissions |
| **B. Backend** | NestJS Core Structure | **Chưa triển khai** | 0% | Chưa có thư mục backend |
| | Controller / Service | **Chưa triển khai** | 0% | Chưa có module nghiệp vụ |
| | DTO & Validation | **Chưa triển khai** | 0% | Chưa cấu hình class-validator |
| | Realtime Engine | **Chưa triển khai** | 0% | Chưa có WebSocket / SSE |
| | File Storage Service | **Chưa triển khai** | 0% | Chưa có storage provider |
| **C. Database** | PostgreSQL Instance | **Chưa triển khai** | 0% | Chưa chạy Docker/Local DB |
| | Prisma ORM Schema | **Chưa triển khai** | 0% | Chưa có `schema.prisma` |
| | Migrations | **Chưa triển khai** | 0% | Chưa có lịch sử di chuyển dữ liệu |
| | Multi-tenancy Scoping | **Chưa triển khai** | 0% | Cần thiết kế ranh giới tổ dân phố |
| **D. Security** | JWT / Refresh Token | **Chưa triển khai** | 0% | Chưa có auth guard |
| | Secure Token Storage | **Chưa triển khai** | 0% | Cần tích hợp `expo-secure-store` |
| | RBAC & Data Isolation | **Chưa triển khai** | 0% | Cần thiết kế Guard đa cấp |
| | Rate Limiting | **Chưa triển khai** | 0% | Chưa cấu hình Throttler |

---

## 4. TỔNG HỢP TRẠNG THÁI 7 MODULE NGHIỆP VỤ

| STT | Phân hệ nghiệp vụ | Frontend UI | Backend API | Database Model | Đánh giá phân loại |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | Bảng tin cộng đồng | Chưa có | Chưa có | Chưa có | **Chưa triển khai** |
| **2** | Thông báo & Sự kiện | Chưa có | Chưa có | Chưa có | **Chưa triển khai** |
| **3** | Quản lý cư dân & Hộ khẩu | Chưa có | Chưa có | Chưa có | **Chưa triển khai** |
| **4** | Quản lý thu chi & Đóng góp | Chưa có | Chưa có | Chưa có | **Chưa triển khai** |
| **5** | Bản đồ cộng đồng & Tiện ích | Chưa có | Chưa có | Chưa có | **Chưa triển khai** |
| **6** | Kết nối cộng đồng & Phản ánh | Chưa có | Chưa có | Chưa có | **Chưa triển khai** |
| **7** | Cá nhân & Tài khoản (Auth) | Chưa có | Chưa có | Chưa có | **Chưa triển khai** |

---

## 5. CÁC LỖI TIỀM ẨN VÀ RỦI RO KỸ THUẬT (TECHNICAL RISKS)

1. **Rủi ro rò rỉ dữ liệu chéo giữa các tổ dân phố (Cross-tenant Data Leakage):**
   - *Nguy cơ:* Nếu backend không ép buộc lọc `toDanPhoId` ở tầng Service/Prisma Middleware, cư dân tổ này có thể xem được dữ liệu sổ hộ khẩu, danh sách đóng góp hoặc phản ánh của tổ khác.
   - *Giải pháp kiến trúc:* Áp dụng triệt để mẫu thiết kế Multi-tenant Scope Guard và Prisma Query Extension tự động gắn `toDanPhoId`.

2. **Rủi ro lộ lọt thông tin nhận dạng cá nhân (PII - Personally Identifiable Information):**
   - *Nguy cơ:* CCCD/CMND, số điện thoại, ngày sinh và mối quan hệ gia đình bị lộ lọt khi public API bảng tin hoặc danh sách thành viên.
   - *Giải pháp:* Serialization DTO nghiêm ngặt với `@Exclude()`, mask số CCCD dạng `0010******89`, che số điện thoại đối với cư dân bình thường.

3. **Rủi ro bất đồng bộ trạng thái ngoại tuyến (Offline State & Network Jitter):**
   - *Nguy cơ:* Ứng dụng mobile sử dụng trong điều kiện mạng yếu hoặc mất kết nối tại các khu vực tầng hầm, ngõ sâu.
   - *Giải pháp:* Tận dụng cơ chế Offline First Cache của TanStack Query v5 kết hợp Zustand persist.

4. **Rủi ro đối soát sai lệch trong Quản lý thu chi:**
   - *Nguy cơ:* Thu phí bằng tiền mặt hoặc chuyển khoản VietQR bị trùng lặp, thiếu biên lai minh bạch gây nghi ngờ trong nhân dân.
   - *Giải pháp:* Xây dựng mô hình Transaction kép (`ContributionRecord` đi kèm `FundCampaign` và `AuditLog`), hỗ trợ sinh mã VietQR động có cú pháp nội dung duy nhất (`[MãQuỹ]_[MãHộ]`).

---

## 6. KẾT LUẬN VÀ ĐỀ XUẤT CỦA ARCHITECT

- **Kết luận:** Dự án chưa có mã nguồn tồn dư (Clean Greenfield). Không có nợ kỹ thuật di sản. Toàn bộ định hướng công nghệ React Native + Expo cho Mobile, NestJS + Prisma + PostgreSQL cho Backend là **hoàn toàn chính xác, tối ưu và có khả năng chịu tải tốt**.
- **Mô hình triển khai đề xuất:** Thiết lập cấu trúc **Turborepo Monorepo (pnpm workspace)** với các không gian làm việc độc lập nhưng chia sẻ DTO/Interface:
  - `apps/mobile`: Ứng dụng React Native + Expo Router.
  - `apps/backend`: Dịch vụ NestJS REST API & WebSockets.
  - `packages/shared`: Chứa các interface, DTOs, Enums dùng chung cho cả Mobile và Backend.
- **Phân hệ đủ điều kiện ưu tiên thực hiện đầu tiên:** **Module 7 (Cá nhân, Tài khoản & Xác thực RBAC)** kết hợp khởi tạo Core Database & Multi-tenant Tổ dân phố, tiếp theo là **Module 3 (Quản lý cư dân)** - đóng vai trò là "mỏ neo dữ liệu" cho toàn bộ 5 module còn lại.

