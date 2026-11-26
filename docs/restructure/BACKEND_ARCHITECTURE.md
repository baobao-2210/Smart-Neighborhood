# KIẾN TRÚC BACKEND ĐỀ XUẤT (BACKEND ARCHITECTURE)
## SMART NEIGHBORHOOD – NESTJS + PRISMA + SOCKET.IO

---

## 1. LỰA CHỌN CÔNG NGHỆ & ĐÁNH GIÁ KẾ THỪA

- **Giữ nguyên & nâng cấp nền tảng hiện có tại `apps/backend`:**
  - **Framework:** NestJS `10.4.x` + TypeScript (Strict mode).
  - **ORM & CSDL:** Prisma ORM `5.22.0` + PostgreSQL 16.
  - **Xác thực & Phân quyền:** `@nestjs/jwt`, `@nestjs/passport`, `argon2` (hoặc `bcrypt`), Custom RBAC + Multi-tenant Guards.
  - **Realtime:** `@nestjs/websockets` + `@nestjs/platform-socket.io` (Socket.IO) cho Module 5 (Chat) và cập nhật trạng thái Phản ánh/Thông báo.
  - **Push Notification:** Firebase Admin SDK (`firebase-admin`) cho FCM kết hợp Expo Push Server SDK.
  - **Tài liệu API:** `@nestjs/swagger` (OpenAPI 3.0 tại `/api/docs`).
  - **Bảo mật & Vận hành:** `helmet`, `@nestjs/throttler` (Rate Limiting), `nestjs-pino` hoặc Winston Logger, `@nestjs/config` + `Joi/Zod` validate biến môi trường.

---

## 2. KIẾN TRÚC PHÂN LỚP (LAYERED ARCHITECTURE)

Mỗi module nghiệp vụ tuyệt đối **không viết logic vào Controller**, tuân thủ chặt chẽ luồng dữ liệu 4 lớp:

```
HTTP Request / WebSocket Event
       │
       ▼
[1. Guards & Pipes Layer]
  - ThrottlerGuard (Rate limiting)
  - JwtAuthGuard (Xác thực token & gắn req.user)
  - RolesGuard (Kiểm tra vai trò theo @Roles)
  - NeighborhoodScopeGuard (Chặn truy cập chéo tổ dân phố)
  - ValidationPipe (whitelist: true, forbidNonWhitelisted: true)
       │
       ▼
[2. Controller / Gateway Layer]
  - Tiếp nhận request, parse DTO, gọi Service, trả về chuẩn ApiEnvelope
  - Swagger Decorators (@ApiTags, @ApiOperation, @ApiBearerAuth)
       │
       ▼
[3. Service Layer (Business Logic)]
  - Thực thi quy tắc nghiệp vụ, kiểm tra quyền sở hữu tài nguyên (ownership)
  - Ghi AuditLog cho thao tác quan trọng, kích hoạt EventEmitter / Notification / Socket
       │
       ▼
[4. Repository / Data Access Layer]
  - Các lớp *Repository đóng gói truy vấn PrismaService
  - Tự động áp dụng soft-delete filter (deletedAt: null) và neighborhoodId scope
```

---

## 3. CẤU TRÚC THƯ MỤC BACKEND ĐỀ XUẤT (`apps/backend/src`)

```
apps/backend/src/
├── main.ts                        # Bootstrap, Helmet, CORS, Global Pipes, Filters, Swagger
├── app.module.ts                  # Root Module kết nối Config, Throttler, Database, Modules
├── config/
│   ├── env.validation.ts          # Kiểm tra DATABASE_URL, JWT_SECRET, FCM_KEY... khi khởi động
│   └── configuration.ts
├── common/
│   ├── decorators/                # @CurrentUser(), @Roles(), @Public()
│   ├── dto/                       # PaginationQueryDto, ApiResponseDto
│   ├── filters/                   # HttpExceptionFilter, PrismaExceptionFilter
│   ├── guards/                    # JwtAuthGuard, RolesGuard, NeighborhoodScopeGuard, WsJwtGuard
│   ├── interceptors/              # TransformInterceptor, LoggingInterceptor
│   └── utils/                     # PII Masking, File validation helpers
├── database/
│   ├── database.module.ts
│   └── prisma.service.ts
└── modules/
    ├── auth/                      # Đăng ký, Đăng nhập, Refresh Token Rotation, Đổi mật khẩu
    ├── users/                     # Hồ sơ, Cài đặt thông báo/riêng tư, Yêu cầu xóa tài khoản
    ├── neighborhoods/             # Quản lý Tổ dân phố (Multi-tenant root)
    ├── feed/                      # Module 1: Bài viết, Bình luận, Tương tác
    ├── reports/                   # Module 1 & 4: Phản ánh sự cố, Lịch sử trạng thái xử lý
    ├── announcements/             # Module 2: Thông báo chính thức, Ghim, Đã đọc
    ├── events/                    # Module 2: Lịch sự kiện, Đăng ký tham gia
    ├── notifications/             # Module 2: Push Notification (FCM/Expo) & Hộp thư thông báo
    ├── residents/                 # Module 3: Hộ gia đình, Thành viên hộ, Chủ hộ, Cư trú
    ├── map/                       # Module 4: Truy vấn phản ánh PUBLIC, Sự kiện & Điểm cộng đồng
    ├── chat/                      # Module 5: Conversations, Messages, Socket.IO Gateway, Kiểm duyệt
    ├── upload/                    # Upload ảnh/tệp an toàn (MIME check, size limit, signed URL/S3)
    └── audit/                     # Ghi & tra cứu AuditLogs cho Super Admin / Tổ trưởng
```

*(Lưu ý: Loại bỏ hoàn toàn `modules/finance/` so với cấu trúc cũ.)*

---

## 4. THIẾT KẾ CÁC THÀNH PHẦN BẢO MẬT & VẬN HÀNH TRỌNG YẾU

1. **Quản lý Secrets:** Tuyệt đối không hardcode `JWT_SECRET`, `DATABASE_URL`, `FIREBASE_PRIVATE_KEY` trong code; đọc qua `@nestjs/config` và validate fail-fast khi khởi động.
2. **Exception Handling & Logging:**
   - `AllExceptionsFilter` bắt cả `HttpException` lẫn `PrismaClientKnownRequestError` (như `P2002` trùng unique, `P2025` không tìm thấy) để trả lỗi có cấu trúc thống nhất, không lộ stack trace ở môi trường production.
3. **Upload File an toàn (`UploadModule`):**
   - Kiểm tra Magic Bytes / MIME type cho phép (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`), giới hạn dung lượng (ảnh ≤ 5MB, tài liệu ≤ 10MB), đổi tên file ngẫu nhiên (UUID) chống Path Traversal.
4. **Realtime Socket.IO (`ChatGateway`):**
   - Xác thực JWT ngay tại bước `handleConnection(client)` qua `WsJwtGuard`.
   - Tự động cho socket join phòng `neighborhood:{neighborhoodId}` và các phòng `conversation:{conversationId}` mà user là thành viên hợp lệ.

