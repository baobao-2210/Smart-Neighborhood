# ĐẶC TẢ VÀ ĐÁNH GIÁ HỆ THỐNG GIAO DIỆN LẬP TRÌNH (API AUDIT)
## HỆ THỐNG QUẢN LÝ TỔ DÂN PHỐ

- **Chuẩn giao tiếp:** RESTful API & WebSocket (Socket.IO)
- **Tài liệu:** `API_AUDIT.md`
- **Phiên bản:** 1.0.0

---

## 1. QUY CHUẨN THIẾT KẾ REST API

### 1.1. Cấu trúc Tiêu đề và Xác thực (Headers)
Mọi request gửi lên Backend đều phải đính kèm:
- `Content-Type: application/json` (hoặc `multipart/form-data` khi tải tệp).
- `Authorization: Bearer <AccessToken>` (Ngoại trừ các public endpoint như login).
- `X-Client-Version: 1.0.0` (Hỗ trợ quản lý phiên bản app mobile).

### 1.2. Chuẩn hóa Phản hồi (Standard Response Envelope)
Tất cả endpoint trả về cấu trúc thống nhất:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lấy danh sách bài đăng thành công",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 154,
    "totalPages": 8
  },
  "timestamp": "2026-11-23T08:00:00.000Z"
}
```

---

## 2. MA TRẬN TOÀN BỘ ENDPOINTS THEO 7 MODULE

### 2.1. Phân hệ Xác thực & Quản lý Tài khoản (Module 7 & Auth)
| Method | Endpoint | Quyền hạn (Role) | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Đăng nhập bằng số điện thoại và mật khẩu |
| `POST` | `/api/v1/auth/refresh` | Public (Token) | Cấp mới Access Token từ Refresh Token |
| `POST` | `/api/v1/auth/logout` | All Roles | Hủy phiên làm việc và thu hồi Refresh Token |
| `GET`  | `/api/v1/auth/me` | All Roles | Lấy thông tin tài khoản và quyền hạn hiện tại |
| `PUT`  | `/api/v1/users/profile` | All Roles | Cập nhật avatar, số điện thoại phụ, mật khẩu |
| `POST` | `/api/v1/users/device-token` | All Roles | Đăng ký Expo Push Token để nhận thông báo |

### 2.2. Phân hệ Bảng tin Cộng đồng (Module 1)
| Method | Endpoint | Quyền hạn (Role) | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET`    | `/api/v1/posts` | All Roles | Lấy danh sách bài viết (phân trang vô tận) |
| `POST`   | `/api/v1/posts` | All Roles | Đăng bài viết mới (kèm ảnh/video) |
| `GET`    | `/api/v1/posts/:id` | All Roles | Lấy chi tiết bài viết và danh sách bình luận |
| `POST`   | `/api/v1/posts/:id/reactions`| All Roles | Thả biểu cảm (LIKE, HEART, CLAP) |
| `POST`   | `/api/v1/posts/:id/comments` | All Roles | Bình luận vào bài viết |
| `DELETE` | `/api/v1/posts/:id` | Tác giả / Tổ trưởng | Xóa bài viết |
| `PATCH`  | `/api/v1/posts/:id/pin` | Tổ trưởng / Tổ phó | Ghim bài viết quan trọng lên đầu bảng tin |

### 2.3. Phân hệ Thông báo & Sự kiện (Module 2)
| Method | Endpoint | Quyền hạn (Role) | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/v1/announcements` | All Roles | Lấy danh sách thông báo chính thức của tổ |
| `POST` | `/api/v1/announcements` | Tổ trưởng, Tổ phó, Cán bộ | Ban hành thông báo mới (kích hoạt Push Noti) |
| `GET`  | `/api/v1/announcements/:id` | All Roles | Chi tiết thông báo và tệp đính kèm |
| `POST` | `/api/v1/announcements/:id/read` | Cư dân | Gửi biên nhận xác nhận đã đọc thông báo |
| `GET`  | `/api/v1/events` | All Roles | Lấy danh sách lịch sinh hoạt, cuộc họp tổ |
| `POST` | `/api/v1/events` | Tổ trưởng, Tổ phó | Lên lịch sự kiện mới |
| `POST` | `/api/v1/events/:id/attend` | Cư dân | Đăng ký tham gia / Báo vắng mặt |

### 2.4. Phân hệ Quản lý Cư dân & Hộ khẩu (Module 3)
| Method | Endpoint | Quyền hạn (Role) | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/v1/households` | Tổ trưởng, Cán bộ, CSKV | Danh sách hộ gia đình trong tổ (tìm kiếm số nhà) |
| `POST` | `/api/v1/households` | Tổ trưởng, Cán bộ | Tạo mới sổ hộ gia đình |
| `GET`  | `/api/v1/households/:id` | Tổ trưởng, CSKV, Chủ hộ | Chi tiết hộ gia đình và danh sách thành viên |
| `POST` | `/api/v1/households/:id/residents` | Tổ trưởng, Cán bộ | Thêm nhân khẩu vào hộ |
| `GET`  | `/api/v1/residents/my-household` | Cư dân | Xem thông tin hộ gia đình của chính mình |
| `PUT`  | `/api/v1/residents/:id` | Tổ trưởng, Cán bộ | Cập nhật thông tin nhân khẩu, trạng thái tạm trú |
| `GET`  | `/api/v1/residents/stats` | Ban điều hành tổ | Báo cáo nhân khẩu học (độ tuổi, giới tính, tạm trú)|

### 2.5. Phân hệ Quản lý Thu chi & Đóng góp (Module 4)
| Method | Endpoint | Quyền hạn (Role) | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/v1/funds` | All Roles | Danh sách các khoản vận động quỹ & phí thu |
| `POST` | `/api/v1/funds` | Tổ trưởng | Tạo chiến dịch vận động/khoản thu mới |
| `GET`  | `/api/v1/funds/:id/summary` | All Roles | Báo cáo công khai số dư quỹ và tiến độ thu |
| `GET`  | `/api/v1/funds/:id/contributions` | Ban điều hành | Danh sách biên lai đóng nộp của các hộ |
| `POST` | `/api/v1/funds/:id/contributions` | Ban điều hành | Ghi nhận phiếu thu tiền mặt trực tiếp |
| `POST` | `/api/v1/funds/:id/generate-vietqr`| Cư dân | Sinh mã VietQR động kèm cú pháp chuyển khoản |
| `POST` | `/api/v1/funds/:id/expenses` | Ban điều hành | Ghi nhận phiếu chi và tải lên hóa đơn chứng từ |

### 2.6. Phân hệ Bản đồ Cộng đồng & Tiện ích (Module 5)
| Method | Endpoint | Quyền hạn (Role) | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/v1/map/places` | All Roles | Lấy danh sách điểm tiện ích (lọc theo loại) |
| `POST` | `/api/v1/map/places` | Ban điều hành | Thêm điểm tiện ích mới (nhà văn hóa, trụ cứu hỏa) |
| `GET`  | `/api/v1/map/boundary` | All Roles | Lấy GeoJSON ranh giới hành chính của tổ |

### 2.7. Phân hệ Kết nối Cộng đồng & Phản ánh Hiện trường (Module 6)
| Method | Endpoint | Quyền hạn (Role) | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET`   | `/api/v1/requests` | All Roles | Danh sách phản ánh trật tự đô thị (công khai) |
| `POST`  | `/api/v1/requests` | Cư dân | Gửi phản ánh hiện trường kèm ảnh chứng cứ |
| `GET`   | `/api/v1/requests/:id` | All Roles | Chi tiết tiến độ và phản hồi từ cán bộ |
| `PATCH` | `/api/v1/requests/:id/status` | Ban điều hành | Cập nhật trạng thái (Đang xử lý / Đã xử lý) |
| `POST`  | `/api/v1/emergency/sos` | Cư dân | Bắn tín hiệu cứu trợ khẩn cấp (SOS/Hỏa hoạn) |

---

## 3. ĐẶC TẢ THỜI GIAN THỰC (REALTIME SPECIFICATION)

1. **Namespace WebSocket:** `/ws/neighborhood`
2. **Các sự kiện cốt lõi (Socket Events):**
   - `client:join_neighborhood` (payload: `{ toDanPhoId }`): Tham gia phòng của tổ dân phố.
   - `server:new_post`: Thông báo bài viết mới trên bảng tin.
   - `server:fund_update`: Cập nhật thời gian thực khi có khoản tiền đóng góp mới ghi nhận.
   - `server:emergency_sos_broadcast`: Phát chuông cảnh báo khẩn cấp toàn bộ thiết bị trong tổ.

