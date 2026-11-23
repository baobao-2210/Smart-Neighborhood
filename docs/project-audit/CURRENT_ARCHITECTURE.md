# KIẾN TRÚC HỆ THỐNG HIỆN TẠI VÀ THIẾT KẾ ĐÍCH
## (SYSTEM ARCHITECTURE SPECIFICATION)

- **Dự án:** Quản Lý Tổ Dân Phố (Neighborhood Management App)
- **Tài liệu:** `CURRENT_ARCHITECTURE.md`
- **Phiên bản:** 1.0.0
- **Trạng thái:** Blueprint đã thẩm định cho giai đoạn khởi tạo

---

## 1. TỔNG QUAN HÌNH THÁI KIẾN TRÚC (TOPOLOGY ARCHITECTURE)

Hệ thống được thiết kế theo hình thái **Modular Monorepo** sử dụng `pnpm workspace`, bảo đảm tính nhất quán về kiểu dữ liệu (Single Source of Truth) giữa Frontend Mobile và Backend API.

```
menager_small/
├── apps/
│   ├── mobile/                  # React Native + Expo Router v4 (Client cho Cư dân & Ban điều hành)
│   │   ├── app/                 # File-based routing (Expo Router)
│   │   │   ├── (auth)/          # Luồng xác thực: đăng nhập, quên mật khẩu, kích hoạt định danh
│   │   │   ├── (tabs)/          # Giao diện chính điều hướng dạng Tab Bar
│   │   │   │   ├── feed/        # Module 1: Bảng tin cộng đồng
│   │   │   │   ├── notice/      # Module 2: Thông báo & Sự kiện
│   │   │   │   ├── residents/   # Module 3: Quản lý cư dân & Hộ gia đình
│   │   │   │   ├── finance/     # Module 4: Quản lý thu chi & Đóng góp
│   │   │   │   ├── map/         # Module 5: Bản đồ cộng đồng & Tiện ích
│   │   │   │   └── connect/     # Module 6: Kết nối phản ánh & Dịch vụ
│   │   │   ├── profile/         # Module 7: Trang cá nhân & Cài đặt tài khoản
│   │   │   └── _layout.tsx      # Root Navigation Layout, Theme Provider, Auth Guard
│   │   ├── src/
│   │   │   ├── components/      # Design System Components (Typography, Button, Card, Modal, Input)
│   │   │   ├── constants/       # Color palette, spacing, typography scale
│   │   │   ├── hooks/           # Custom React hooks (useAuth, useNeighborhood, useLocation)
│   │   │   ├── services/        # Axios API Client, React Query Hooks, SecureStore adapters
│   │   │   ├── store/           # Zustand Stores (AuthStore, UIStore, OfflineCacheStore)
│   │   │   └── utils/           # Formatters (tiền tệ VND, ngày tháng việt hóa, mask CCCD)
│   │   ├── assets/              # Icons, illustrations, splash screens
│   │   ├── app.json             # Cấu hình Expo, Bundle ID, Permissions (Camera, Location, Push)
│   │   └── package.json
│   │
│   └── backend/                 # NestJS REST API Server & Realtime Engine
│       ├── src/
│       │   ├── common/          # Decorators (@Roles, @CurrentUser), Filters, Interceptors, Pipes
│       │   ├── config/          # Environment variables validation (Joi/Zod)
│       │   ├── database/        # Prisma Service, Prisma Module, Client Extensions
│       │   └── modules/         # 7 Core Business Modules
│       │       ├── auth/        # JWT Authentication, Refresh Token Rotation, Password hashing
│       │       ├── users/       # Quản lý tài khoản, phân quyền Role, hồ sơ cá nhân
│       │       ├── to-dan-pho/  # Quản lý Tổ dân phố, Phường/Xã, ranh giới hành chính
│       │       ├── feed/        # Bảng tin cộng đồng, bài viết, tương tác, bình luận
│       │       ├── notification/# Thông báo khẩn cấp, sự kiện, biên nhận đã đọc, Expo Push SDK
│       │       ├── residents/   # Hộ gia đình, nhân khẩu, biến động tạm trú/tạm vắng
│       │       ├── finance/     # Các quỹ vận động, biên lai thu tiền, phiếu chi, VietQR
│       │       ├── map/         # Điểm tiện ích, toạ độ GIS, camera, điểm cứu hỏa
│       │       ├── connect/     # Tiếp nhận phản ánh trật tự đô thị, xử lý kiến nghị, SOS
│       │       └── upload/      # Xử lý upload ảnh/tài liệu (Local/Cloudinary/S3)
│       ├── prisma/
│       │   ├── schema.prisma    # Toàn bộ Data Models & Relations
│       │   └── migrations/      # Lịch sử di chuyển cấu trúc CSDL
│       └── package.json
│
├── packages/
│   └── shared/                  # Thư viện dùng chung
│       ├── src/
│       │   ├── types/           # UserRole, ResidentStatus, PaymentMethod, ReactionType
│       │   ├── dtos/            # Shared DTO contracts
│       │   └── constants/       # Regex validations, System constants
│       └── package.json
│
├── docs/                        # Tài liệu kỹ thuật, audit và hướng dẫn vận hành
│   └── project-audit/
├── package.json                 # Root monorepo package.json
└── pnpm-workspace.yaml          # Khai báo workspace
```

---

## 2. THIẾT KẾ CHI TIẾT FRONTEND MOBILE (REACT NATIVE + EXPO)

### 2.1. Nền tảng và Công nghệ
- **Framework:** React Native (bản mới nhất 0.76+ hoặc Expo SDK 52) hỗ trợ New Architecture (Turbomodules & Fabric renderer) cho hiệu năng mượt mà 60-120fps.
- **Routing Engine:** **Expo Router v4** (File-based Routing).
  - Tự động đồng bộ đường dẫn URL, hỗ trợ Deep Linking dạng `todanpho://feed/:id` hoặc `todanpho://notice/:id`.
  - Phân tách cấu trúc rõ ràng: Stack Navigation cho luồng chi tiết/modal và Tab Navigation cho các phân hệ thường trực.
- **TypeScript:** Cấu hình chế độ `strict: true`, cấm sử dụng kiểu dữ liệu `any`, bảo đảm an toàn kiểu từ API response đến UI View.

### 2.2. Design System & UX cho Môi trường Dân sinh
Đặc thù người dùng tổ dân phố có cả **người cao tuổi, cán bộ hưu trí** lẫn **thanh niên**:
- **Bảng màu (Color Tokens):**
  - *Primary (Chủ đạo):* Xanh lam đậm `#0D47A1` hoặc Đỏ đô truyền thống `#B71C1C` mang tính chất hành chính tin cậy.
  - *Success (Thu tiền / Thành công):* `#2E7D32`.
  - *Warning (Thông báo cảnh báo / Nhắc nợ):* `#E65100`.
  - *Danger (Khẩn cấp / Báo cháy / SOS):* `#C62828`.
  - *Neutral (Màu nền, chữ):* Nền trắng `#FFFFFF`, xám nhạt `#F5F7FA`, chữ đen độ tương phản cao `#1A1D20`.
- **Typography Scale:**
  - Hỗ trợ Dynamic Font Scaling cho phép người lớn tuổi tăng kích thước chữ không bị vỡ giao diện.
  - Các cấp bậc: Heading 1 (24px, Bold), Heading 2 (20px, Semi-bold), Body Large (16px), Body Regular (14px), Caption (12px).
- **Bộ Component chuẩn hóa:**
  - `AppButton`: Hỗ trợ Primary, Secondary, Outline, Danger với trạng thái loading spinner.
  - `CitizenCard`: Thẻ hiển thị thông tin hộ gia đình/nhân khẩu có mã vạch hoặc QR định danh.
  - `FeedPostCard`: Thẻ bài viết bảng tin kèm avatar tác giả, huy hiệu cán bộ tổ, carousel hình ảnh và nút tương tác.
  - `AmountInput`: Trường nhập tiền tự động định dạng dấu chấm phân cách hàng nghìn (`50.000 đ`).

### 2.3. State Management & Data Fetching
- **Server State & Cache:** **TanStack Query v5 (React Query)**
  - Tối ưu hóa tải trang, tự động refresh nền (`staleTime: 5 phút`).
  - Hỗ trợ phân trang cuộn vô tận (`useInfiniteQuery`) cho Bảng tin cộng đồng (Module 1) và Nhật ký thông báo (Module 2).
  - Hỗ trợ Optimistic Updates (cập nhật giao diện trước khi server trả kết quả cho hành động Thả tim, Đánh dấu đã đọc).
- **Client State:** **Zustand**
  - Nhẹ, không boilerplate như Redux.
  - Quản lý các trạng thái cục bộ: Phiên đăng nhập hiện tại (`AuthStore`), Bộ lọc danh sách cư dân (`FilterStore`), Cài đặt ứng dụng (`SettingsStore`).
- **Offline Storage:**
  - `expo-secure-store`: Lưu trữ an toàn Refresh Token và Token định danh sinh trắc học (FaceID/Vân tay).
  - `AsyncStorage` / `MMKV`: Lưu trữ cache nội dung tin tức ngoại tuyến để cư dân xem lại khi mất mạng.

---

## 3. THIẾT KẾ CHI TIẾT BACKEND (NESTJS)

### 3.1. Cấu trúc Mô-đun hóa (Modular Architecture)
Backend áp dụng kiến trúc **Feature Modules** kết hợp nguyên lý SOLID:
- Mỗi module nghiệp vụ độc lập chứa:
  - `*.module.ts`: Khai báo DI Container.
  - `*.controller.ts`: Tiếp nhận HTTP Request, routing, áp dụng Guards và Interceptors.
  - `*.service.ts`: Xử lý Business Logic, quy tắc nghiệp vụ, tính toán tài chính, gửi thông báo.
  - `dto/*.dto.ts`: Định nghĩa cấu trúc dữ liệu gửi lên với `class-validator` và `class-transformer`.
- Tách biệt rõ ràng tầng Controller -> Service -> Prisma Service -> PostgreSQL.

### 3.2. Chuẩn hóa Định dạng Dữ liệu (API Response Envelope)
Mọi phản hồi từ REST API đều tuân thủ cấu trúc đồng nhất:
```typescript
interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  error?: {
    code: string;
    details: string | string[];
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}
```

### 3.3. Cơ chế Realtime và Thông báo Đẩy (Push Notifications)
- **WebSockets (Socket.IO Gateway):**
  - Kênh `/ws/neighborhood`: Cập nhật trực tiếp số dư quỹ, lượt tương tác bảng tin, trạng thái xử lý phản ánh hiện trường.
  - Kênh `/ws/emergency`: Truyền tải tín hiệu báo động khẩn cấp (SOS, cháy nổ, thiên tai) đến toàn bộ cư dân trong phạm vi tổ dân phố với độ trễ < 500ms.
- **Expo Push Notifications Server:**
  - Đăng ký và quản lý `ExpoPushToken` của thiết bị trong cơ sở dữ liệu.
  - Tự động bắn thông báo khi: Tổ trưởng ban hành thông báo mới, sắp diễn ra cuộc họp tổ dân phố, phát sinh biên lai thu phí mới, phản ánh của cư dân được xử lý.

---

## 4. THIẾT KẾ RANH GIỚI BẢO MẬT ĐA TỔ DÂN PHỐ (MULTI-TENANCY SCOPING)

Hệ thống quản lý hàng chục hoặc hàng trăm tổ dân phố khác nhau. Do đó, ranh giới dữ liệu giữa các tổ dân phố là **tuyệt đối không được xâm phạm**:
1. **Khóa phân vùng logic (`toDanPhoId`):**
   - Mọi thực thể nghiệp vụ cốt lõi (`User`, `Household`, `Post`, `Announcement`, `FundCampaign`, `CommunityRequest`) bắt buộc phải chứa trường `toDanPhoId: String (UUID)`.
2. **Neighborhood Scope Guard:**
   - Middleware/Guard kiểm tra mã `toDanPhoId` trong JWT của người gọi với dữ liệu yêu cầu truy cập.
   - Trừ trường hợp người dùng có quyền `SUPER_ADMIN` (Cán bộ Quận/Huyện) có thể xem dữ liệu liên tổ, tất cả người dùng khác chỉ được phép đọc/ghi dữ liệu trong phạm vi tổ dân phố của mình.
3. **Prisma Client Extension tự động lọc:**
   - Cài đặt Prisma Client Extension để tự động gán bộ lọc `where: { toDanPhoId: context.toDanPhoId }` cho mọi truy vấn `findMany`, `findFirst`, `count`, loại bỏ hoàn toàn nguy cơ lập trình viên quên thêm điều kiện lọc.

