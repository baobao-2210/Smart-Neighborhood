# ĐẶC TẢ API THEO 6 MODULE (API SPECIFICATION)
## SMART NEIGHBORHOOD – RESTFUL API v1 & SOCKET.IO

- **Base URL:** `/api/v1`
- **Swagger UI:** `/api/docs`
- **Chuẩn phản hồi (Response Envelope):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Thành công",
    "data": {},
    "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 },
    "timestamp": "2026-11-26T07:00:00.000Z"
  }
  ```
- **Chuẩn lỗi (Error Response):**
  ```json
  {
    "success": false,
    "statusCode": 403,
    "errorCode": "FORBIDDEN_RESOURCE",
    "message": "Bạn không có quyền thực hiện thao tác này",
    "details": null,
    "timestamp": "2026-11-26T07:00:00.000Z"
  }
  ```

---

## 1. XÁC THỰC & TÀI KHOẢN CÁ NHÂN (MODULE 6 & AUTH)

| Method | Endpoint | Mục đích | Auth / Roles | Request DTO | Response DTO |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Đăng ký tài khoản cư dân mới | Public | `RegisterDto` (`phoneNumber`, `password`, `fullName`, `neighborhoodCode`) | `AuthTokensDto` + `UserProfileDto` |
| `POST` | `/auth/login` | Đăng nhập (Rate limit 5 req/phút) | Public | `LoginDto` (`phoneNumber`, `password`) | `AuthTokensDto` + `UserProfileDto` |
| `POST` | `/auth/refresh` | Cấp lại Access Token (Token Rotation) | Public (Refresh) | `RefreshTokenDto` (`refreshToken`) | `AuthTokensDto` |
| `POST` | `/auth/logout` | Đăng xuất & thu hồi Refresh Token | Bearer JWT | — | `{ loggedOut: true }` |
| `PATCH` | `/auth/password` | Đổi mật khẩu | Bearer JWT | `ChangePasswordDto` (`oldPassword`, `newPassword`) | `{ updated: true }` |
| `GET` | `/users/me` | Lấy hồ sơ, quyền hạn & cài đặt | Bearer JWT | — | `UserProfileDetailDto` |
| `PATCH` | `/users/me` | Cập nhật họ tên, ảnh đại diện | Bearer JWT | `UpdateProfileDto` | `UserProfileDto` |
| `GET` | `/users/me/household` | Xem thông tin hộ gia đình của tôi | Bearer JWT | — | `HouseholdDetailDto` |
| `GET` | `/users/me/history` | Lịch sử bài đăng, phản ánh, hoạt động | Bearer JWT | `HistoryQueryDto` (`type`, `page`, `limit`) | `Paginated<ActivityItemDto>` |
| `PATCH` | `/users/me/settings` | Cài đặt thông báo & quyền riêng tư | Bearer JWT | `UpdateUserSettingDto` | `UserSettingDto` |
| `POST` | `/users/me/deletion-request` | Gửi yêu cầu xóa tài khoản | Bearer JWT | `CreateDeletionRequestDto` (`reason`) | `DeletionRequestDto` |

---

## 2. BẢNG TIN CỘNG ĐỒNG & PHẢN ÁNH SỰ CỐ (MODULE 1)

| Method | Endpoint | Mục đích | Auth / Roles | Request DTO | Response DTO |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/posts` | Danh sách bài viết (lọc category, pin, search) | Bearer JWT (All) | `PostQueryDto` (`category`, `isPinned`, `search`, `page`, `limit`, `sort`) | `Paginated<PostItemDto>` |
| `POST` | `/posts` | Đăng bài cộng đồng hoặc cảnh báo | Bearer JWT (All; `isOfficial`/`isPinned` chỉ Leader/Staff) | `CreatePostDto` (`content`, `category`, `visibility`, `isOfficial`, `attachmentIds`) | `PostItemDto` |
| `GET` | `/posts/:id` | Chi tiết bài viết & bình luận | Bearer JWT (Scope check) | — | `PostDetailDto` |
| `PATCH` | `/posts/:id` | Sửa bài viết / Ghim bài | Tác giả / Leader | `UpdatePostDto` | `PostItemDto` |
| `DELETE` | `/posts/:id` | Xóa mềm bài viết | Tác giả / Leader / Admin | — | `{ deleted: true }` |
| `POST` | `/posts/:id/reactions` | Thả/hủy biểu cảm | Bearer JWT (All) | `ToggleReactionDto` (`LIKE \| HEART \| CLAP`) | `{ userReaction, reactionCount }` |
| `POST` | `/posts/:id/comments` | Gửi bình luận (hỗ trợ reply) | Bearer JWT (All) | `CreateCommentDto` (`content`, `parentId?`) | `CommentItemDto` |
| `GET` | `/reports` | Danh sách phản ánh sự cố (ẩn `PRIVATE` của người khác với cư dân) | Bearer JWT (All) | `ReportQueryDto` (`category`, `status`, `visibility`, `search`, `page`, `limit`) | `Paginated<ReportItemDto>` |
| `POST` | `/reports` | Gửi báo cáo sự cố kèm ảnh & GPS | Bearer JWT (All) | `CreateReportDto` (`title`, `description`, `category`, `visibility`, `latitude?`, `longitude?`, `addressText?`, `attachmentIds`) | `ReportItemDto` |
| `GET` | `/reports/:id` | Chi tiết phản ánh & lịch sử xử lý | Reporter / Leader / Assigned Staff | — | `ReportDetailDto` |
| `PATCH` | `/reports/:id/status` | Cập nhật trạng thái xử lý & phân công | Leader / Assigned Staff | `UpdateReportStatusDto` (`status`, `assignedToId?`, `note`) | `ReportDetailDto` |

---

## 3. THÔNG BÁO VÀ SỰ KIỆN (MODULE 2)

| Method | Endpoint | Mục đích | Auth / Roles | Request DTO | Response DTO |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/announcements` | Danh sách thông báo tổ (ưu tiên ghim) | Bearer JWT (All) | `AnnouncementQueryDto` (`priority`, `isPinned`, `unreadOnly`, `page`, `limit`) | `Paginated<AnnouncementDto>` |
| `POST` | `/announcements` | Ban hành thông báo chính thức + Push FCM | Leader / Staff | `CreateAnnouncementDto` (`title`, `content`, `priority`, `isPinned`, `attachmentIds`) | `AnnouncementDto` |
| `POST` | `/announcements/:id/read` | Đánh dấu đã đọc thông báo | Bearer JWT (All) | — | `{ readAt }` |
| `GET` | `/announcements/:id/stats` | Thống kê tỷ lệ cư dân đã đọc | Leader / Staff | — | `AnnouncementReadStatsDto` |
| `GET` | `/events` | Lịch sự kiện cộng đồng | Bearer JWT (All) | `EventQueryDto` (`status`, `fromDate`, `toDate`, `page`, `limit`) | `Paginated<EventDto>` |
| `POST` | `/events` | Tạo sự kiện cộng đồng | Leader / Staff | `CreateEventDto` (`title`, `description`, `locationName`, `latitude?`, `longitude?`, `startTime`, `endTime`, `maxAttendees?`) | `EventDto` |
| `POST` | `/events/:id/register` | Đăng ký hoặc hủy tham gia sự kiện | Bearer JWT (All) | `EventRegisterDto` (`status: REGISTERED \| CANCELLED`) | `EventRegistrationDto` |
| `POST` | `/notifications/device-token` | Lưu/cập nhật FCM/Expo Push Token | Bearer JWT (All) | `RegisterDeviceTokenDto` (`token`, `platform`) | `{ registered: true }` |

---

## 4. QUẢN LÝ CƯ DÂN (MODULE 3)

| Method | Endpoint | Mục đích | Auth / Roles | Request DTO | Response DTO |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/households` | Danh sách hộ gia đình trong tổ (tìm kiếm, lọc) | Leader / Staff / Super Admin | `HouseholdQueryDto` (`search`, `street`, `page`, `limit`) | `Paginated<HouseholdSummaryDto>` |
| `POST` | `/households` | Tạo mới sổ hộ gia đình | Leader / Staff | `CreateHouseholdDto` (`code`, `houseNumber`, `street`, `addressDetail`) | `HouseholdDetailDto` |
| `GET` | `/households/:id` | Chi tiết hộ gia đình & danh sách thành viên | Leader / Staff / Chủ hộ của chính hộ đó | — | `HouseholdDetailDto` |
| `PATCH` | `/households/:id` | Cập nhật thông tin hộ gia đình | Leader / Staff | `UpdateHouseholdDto` | `HouseholdDetailDto` |
| `GET` | `/residents` | Tìm kiếm & lọc nhân khẩu theo trạng thái cư trú | Leader / Staff / Super Admin | `ResidentQueryDto` (`search`, `residenceType`, `residenceStatus`, `page`, `limit`) | `Paginated<ResidentItemDto>` (CCCD masked nếu không đủ quyền) |
| `POST` | `/households/:id/members` | Thêm thành viên vào hộ | Leader / Staff | `CreateHouseholdMemberDto` (`fullName`, `cccdNumber?`, `dateOfBirth`, `gender`, `isHead`, `relationToHead`, `residenceType`) | `ResidentItemDto` |
| `PATCH` | `/residents/:id` | Cập nhật thông tin cư trú / đổi chủ hộ | Leader / Staff | `UpdateResidentDto` | `ResidentItemDto` |

---

## 5. BẢN ĐỒ CỘNG ĐỒNG (MODULE 4)

| Method | Endpoint | Mục đích | Auth / Roles | Request DTO | Response DTO |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/map/markers` | Lấy điểm phản ánh `PUBLIC`, sự kiện & điểm cộng đồng | Bearer JWT (All) | `MapFilterDto` (`categories[]`, `reportStatus?`, `bounds?`) | `{ boundaryGeoJson, reports: PublicMapReportDto[], events: MapEventDto[], places: CommunityPlaceDto[] }` |
| `GET` | `/map/reports/:id` | Xem chi tiết phản ánh công khai trên bản đồ | Bearer JWT (All) | — | `PublicMapReportDetailDto` (**Không trả `reporter` PII**, trả `404` nếu là `PRIVATE`) |

---

## 6. KẾT NỐI CỘNG ĐỒNG (MODULE 5) & UPLOAD

| Method | Endpoint | Mục đích | Auth / Roles | Request DTO | Response DTO |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/conversations` | Danh sách cuộc trò chuyện của user | Bearer JWT (All) | `PaginationQueryDto` | `Paginated<ConversationSummaryDto>` |
| `POST` | `/conversations` | Tạo chat 1-1, chat với cán bộ hoặc nhóm | Bearer JWT (Nhóm chỉ Leader/Staff; 1-1 kiểm tra privacy) | `CreateConversationDto` (`type`, `name?`, `participantIds[]`) | `ConversationDetailDto` |
| `GET` | `/conversations/:id/messages` | Lịch sử tin nhắn (cursor/page pagination) | Thành viên cuộc trò chuyện | `MessageQueryDto` | `Paginated<MessageDto>` |
| `POST` | `/conversations/:id/messages` | Gửi tin nhắn (kèm attachmentIds) | Thành viên cuộc trò chuyện | `SendMessageDto` (`content`, `attachmentIds?`) | `MessageDto` |
| `POST` | `/messages/:id/report` | Báo cáo tin nhắn vi phạm | Thành viên cuộc trò chuyện | `ReportMessageDto` (`reason`) | `{ reported: true }` |
| `PATCH` | `/messages/:id/moderate` | Kiểm duyệt/ẩn tin nhắn vi phạm | Leader / Super Admin | `ModerateMessageDto` (`isModerated: boolean`) | `MessageDto` |
| `POST` | `/upload` | Upload ảnh/tệp đính kèm an toàn (`multipart/form-data`) | Bearer JWT (All) | `file` + `entityType` | `AttachmentDto` |

### Sự kiện Socket.IO (`/ws/chat`)
- `client:join_conversation` (`{ conversationId }`)
- `client:send_message` (`{ conversationId, content, attachmentIds }`)
- `server:new_message` (`MessageDto`)
- `server:message_moderated` (`{ messageId, conversationId }`)
- `server:report_status_changed` (`{ reportId, toStatus }`)

