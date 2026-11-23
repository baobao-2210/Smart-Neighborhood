# KIỂM TOÁN VÀ THIẾT KẾ BẢO MẬT HỆ THỐNG (SECURITY AUDIT)
## HỆ THỐNG QUẢN LÝ TỔ DÂN PHỐ

- **Tài liệu:** `SECURITY_AUDIT.md`
- **Phiên bản:** 1.0.0
- **Phạm vi:** Xác thực, phân quyền, an toàn dữ liệu cá nhân (PII), cách ly đa tổ và phòng thủ hạ tầng.

---

## 1. KIẾN TRÚC XÁC THỰC (AUTHENTICATION ARCHITECTURE)

Hệ thống áp dụng mô hình **Dual-Token Authentication** với cơ chế xoay vòng Refresh Token (Token Rotation) nhằm giảm thiểu tối đa rủi ro chiếm đoạt phiên làm việc:

```
+---------------+                    +---------------+                    +---------------+
| Mobile Client |                    |  NestJS API   |                    |  PostgreSQL   |
+---------------+                    +---------------+                    +---------------+
        |                                    |                                    |
        |--- 1. POST /login ---------------->|                                    |
        |    (phone + password)              |--- 2. Verify argon2 hash --------->|
        |                                    |<-- 3. User & Role valid ----------|
        |                                    |--- 4. Gen Access (15m) & Refresh---|
        |                                    |--- 5. Save RefreshHash to DB ----->|
        |<-- 6. Return Access & Refresh -----|                                    |
        |    (Store in SecureStore)          |                                    |
        |                                    |                                    |
        |--- 7. Request with AccessToken --->|                                    |
        |    (Authorization: Bearer ...)     |--- 8. Verify JWT Signature ------->|
        |<-- 9. 200 OK with Data ------------|                                    |
```

1. **Access Token (JWT):**
   - Thời gian sống ngắn: **15 phút**.
   - Payload: `{ sub: userId, role: UserRole, toDanPhoId: string }`.
   - Lưu trữ trên Client: Chỉ giữ trong RAM / Zustand Memory State (tuyệt đối không ghi ra AsyncStorage dạng cleartext).
2. **Refresh Token:**
   - Thời gian sống dài: **30 ngày**.
   - Lưu trữ trên Mobile: Bắt buộc sử dụng `expo-secure-store` (tận dụng phần cứng an toàn Apple Keychain trên iOS và Android Keystore / EncryptedSharedPreferences).
   - Lưu trữ trên Backend: Chỉ lưu bản băm mật mã (`refreshTokenHash` qua bcrypt/argon2).
   - Cơ chế Xoay vòng (Rotation): Mỗi lần gọi `/auth/refresh`, Backend thu hồi token cũ, sinh cặp token mới và cập nhật bản băm mới vào CSDL. Nếu phát hiện token cũ được tái sử dụng, toàn bộ phiên của người dùng sẽ bị hủy ngay lập tức (phòng chống tấn công replay).

---

## 2. PHÂN QUYỀN VÀ BẢO VỆ DỮ LIỆU ĐA TỔ DÂN PHỐ (RBAC & MULTI-TENANCY)

### 2.1. Cấu trúc Guard 3 lớp trên NestJS
Mọi API nhạy cảm đều đi qua chuỗi Guard tuần tự:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, NeighborhoodScopeGuard)
```
1. **`JwtAuthGuard`:** Xác thực token hợp lệ, còn hạn và giải mã danh tính người dùng (`req.user`).
2. **`RolesGuard`:** So khớp quyền của user với Decorator `@Roles(UserRole.TO_TRUONG, UserRole.CAN_BO)`.
3. **`NeighborhoodScopeGuard`:** Đối chiếu mã `req.user.toDanPhoId` với `toDanPhoId` của tài nguyên được yêu cầu. Chặn đứng 100% các hành vi truy cập chéo giữa các tổ dân phố (Cross-tenant Access).

### 2.2. Ma trận Phân quyền Vai trò (RBAC Matrix)

| Quyền hạn / Nghiệp vụ | Cư dân | Tổ phó / Cán bộ | Tổ trưởng | Cảnh sát KV | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Xem bảng tin, gửi bình luận | Có | Có | Có | Có | Có |
| Ghim bài, kiểm duyệt bài viết | Không | Có | Có | Không | Có |
| Ban hành thông báo chính thức | Không | Có | Có | Có (An ninh) | Có |
| Xem hộ khẩu của mình | Có | Có | Có | Có | Có |
| Tra cứu toàn bộ hộ khẩu trong tổ | Không | Có | Có | Có | Có |
| Thêm/Sửa/Xóa dữ liệu nhân khẩu | Không | Có | Có | Có | Có |
| Xem công khai thu chi quỹ tổ | Có | Có | Có | Có | Có |
| Tạo quỹ thu & Lập phiếu chi | Không | Có | Có | Không | Có |
| Tiếp nhận & Xử lý phản ánh | Không | Có | Có | Có | Có |
| Bắn thông báo báo động SOS | Có | Có | Có | Có | Có |

---

## 3. BẢO VỆ DỮ LIỆU CÁ NHÂN VÀ TÍNH RIÊNG TƯ (PII PROTECTION)

Đặc thù ứng dụng dân sinh quản lý nhiều thông tin nhạy cảm (Căn cước công dân, ngày sinh, số điện thoại, sổ hộ khẩu):
1. **Kỹ thuật Mặt nạ Dữ liệu (Data Masking):**
   - Số CCCD hiển thị công khai trên giao diện kiểm tra danh sách: `0010******89` (chỉ hiển thị 4 số đầu và 2 số cuối).
   - Số điện thoại cư dân trên bảng tin/bình luận được ẩn hoàn toàn để phòng tránh quấy rối và lừa đảo.
2. **Loại trừ trường nhạy cảm ở cấp DTO (Serialization):**
   - Sử dụng `class-transformer` với `@Exclude()` trên `passwordHash`, `refreshTokenHash` trong entity `User`.
   - Chặn tuyệt đối việc trả mật khẩu băm ra JSON response trong bất kỳ tình huống nào.
3. **Quyền riêng tư hình ảnh và tài liệu:**
   - Ảnh chụp hiện trường phản ánh nhạy cảm (mâu thuẫn hàng xóm, tệ nạn) chỉ hiển thị cho Ban điều hành và Cảnh sát khu vực, không hiển thị công khai trên Bảng tin chung.

---

## 4. BẢO VỆ HẠ TẦNG VÀ PHÒNG THỦ MẠNG (INFRASTRUCTURE HARDENING)

1. **Chống tấn công từ chối dịch vụ (Rate Limiting):**
   - Tích hợp `@nestjs/throttler`:
     - Giới hạn toàn cục: Tối đa 60 requests/phút trên mỗi địa chỉ IP.
     - Giới hạn khắt khe cho `/auth/login`: Tối đa 5 lần thử/phút (chống dò mật khẩu brute-force).
2. **Bảo mật Header HTTP:**
   - Kích hoạt `helmet` loại bỏ header `X-Powered-By: Express/NestJS`, thiết lập Content Security Policy (CSP), chống Clickjacking (`X-Frame-Options: DENY`).
3. **Lọc dữ liệu đầu vào nghiêm ngặt (Input Validation):**
   - Thiết lập `ValidationPipe` với cấu hình:
     ```typescript
     new ValidationPipe({
       whitelist: true,              // Tự động loại bỏ các thuộc tính lạ nằm ngoài DTO
       forbidNonWhitelisted: true,  // Báo lỗi 400 nếu client gửi trường trái phép
       transform: true,              // Tự động ép kiểu theo type DTO
     })
     ```
   - Chống hoàn toàn lỗ hổng chèn mã độc (SQL Injection qua Prisma Parameterized Queries và XSS qua HTML entity escaping).

