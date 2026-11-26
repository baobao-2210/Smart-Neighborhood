# HỆ THỐNG QUẢN LÝ TỔ DÂN PHỐ (NEIGHBORHOOD MANAGEMENT APP)

Hệ thống chuyển đổi số toàn diện cấp cơ sở phục vụ Ban điều hành tổ dân phố và Cộng đồng dân cư.

---

## 1. CẤU TRÚC THƯ MỤC DỰ ÁN (MONOREPO)

```
menager_small/
├── apps/
│   ├── mobile/                  # React Native + Expo Router v4 (Mobile App cho Cư dân & Cán bộ)
│   │   ├── app/                 # File-based routing (Expo Router)
│   │   │   ├── (auth)/          # Luồng đăng nhập, kích hoạt định danh
│   │   │   ├── (tabs)/          # Giao diện chính điều hướng dạng Tab Bar
│   │   │   │   ├── feed/        # Module 1: Bảng tin cộng đồng
│   │   │   │   ├── notice/      # Module 2: Thông báo & Sự kiện
│   │   │   │   ├── residents/   # Module 3: Quản lý cư dân & Hộ gia đình
│   │   │   │   ├── finance/     # Module 4: Quản lý thu chi & Đóng góp
│   │   │   │   ├── map/         # Module 5: Bản đồ cộng đồng & Tiện ích
│   │   │   │   └── connect/     # Module 6: Kết nối phản ánh & Dịch vụ
│   │   │   ├── profile/         # Module 7: Trang cá nhân & Cài đặt tài khoản
│   │   │   └── _layout.tsx      # Root Navigation Layout
│   │   ├── src/
│   │   │   ├── components/      # Design System Components (Typography, Button, Card, Modal, Input)
│   │   │   ├── constants/       # Color palette, spacing, typography scale
│   │   │   ├── hooks/           # Custom React hooks (useAuth, useNeighborhood, useLocation)
│   │   │   ├── services/        # Axios API Client, React Query Hooks, SecureStore adapters
│   │   │   ├── store/           # Zustand Stores (AuthStore, UIStore, OfflineCacheStore)
│   │   │   └── utils/           # Formatters (VND, ngày tháng, mask CCCD)
│   │   └── assets/              # Icons, illustrations, splash screens
│   │
│   └── backend/                 # NestJS REST API Server & Realtime Engine
│       ├── src/
│       │   ├── common/          # Decorators, Filters, Guards, Interceptors, Pipes
│       │   ├── config/          # Cấu hình biến môi trường
│       │   ├── database/        # Prisma Service & Prisma Module
│       │   └── modules/         # 7 Phân hệ nghiệp vụ
│       │       ├── auth/        # JWT Authentication, Refresh Token Rotation
│       │       ├── users/       # Quản lý tài khoản, phân quyền Role
│       │       ├── to-dan-pho/  # Quản lý Tổ dân phố & ranh giới hành chính
│       │       ├── feed/        # Bảng tin cộng đồng, bài viết, tương tác
│       │       ├── notification/# Thông báo khẩn cấp, sự kiện, Expo Push SDK
│       │       ├── residents/   # Hộ gia đình, nhân khẩu, biến động tạm trú
│       │       ├── finance/     # Quỹ vận động, biên lai, phiếu chi, VietQR
│       │       ├── map/         # Điểm tiện ích, toạ độ GIS, camera an ninh
│       │       ├── connect/     # Phản ánh trật tự đô thị, ý kiến cử tri, SOS
│       │       └── upload/      # Xử lý upload ảnh/tài liệu
│       └── prisma/
│           ├── schema.prisma    # Toàn bộ Data Models & Relations
│           └── migrations/      # Lịch sử di chuyển cấu trúc CSDL
│
├── packages/
│   └── shared/                  # Thư viện dùng chung (Types, DTOs, Enums)
├── docs/                        # Tài liệu kỹ thuật, audit và hướng dẫn vận hành
│   └── project-audit/
├── .gitignore
├── pnpm-workspace.yaml
├── docker-compose.yml
└── package.json
```

---

## 2. 7 MODULE NGHIỆP VỤ CỐT LÕI

1. **Bảng tin cộng đồng (Community Feed):** Tương tác đa chiều, chia sẻ tin tức đời sống dân sinh.
2. **Thông báo và sự kiện (Announcements & Events):** Thông báo hành chính, báo động khẩn cấp, lịch sinh hoạt tổ.
3. **Quản lý cư dân (Residents & Households):** Sổ hộ khẩu điện tử, nhân khẩu thường trú/tạm trú, dữ liệu CCCD.
4. **Quản lý thu chi và đóng góp (Finance & Contributions):** Quỹ vận động, phí vệ sinh, minh bạch hóa thu chi, VietQR.
5. **Bản đồ cộng đồng (Community Map):** Ranh giới tổ dân phố, vị trí nhà văn hóa, trạm y tế, trụ cứu hỏa, camera.
6. **Kết nối cộng đồng (Community Connect):** Phản ánh hiện trường trật tự đô thị, kiến nghị cử tri, báo động SOS.
7. **Cá nhân và tài khoản (Profile & Account):** Quản lý tài khoản, phân quyền RBAC 6 cấp bậc, bảo mật dữ liệu PII.

---

## 3. TÀI LIỆU KIỂM TOÁN KIẾN TRÚC

Chi tiết kết quả kiểm toán và thiết kế hệ thống nằm trong thư mục `docs/project-audit/`:
- `PROJECT_AUDIT.md`: Báo cáo kiểm toán tổng thể.
- `CURRENT_ARCHITECTURE.md`: Đặc tả kiến trúc Mobile, Backend & Multi-tenancy.
- `DATABASE_AUDIT.md`: Thiết kế CSDL PostgreSQL & Prisma Schema.
- `API_AUDIT.md`: Chuẩn REST API và ma trận endpoints.
- `SECURITY_AUDIT.md`: Thiết kế bảo mật, RBAC và bảo vệ thông tin PII.
- `MODULE_READINESS.md`: Đánh giá mức độ sẵn sàng của 7 module.
- `DEVELOPMENT_ROADMAP.md`: Lộ trình phát triển 7 giai đoạn.

