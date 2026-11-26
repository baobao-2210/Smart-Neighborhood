# MA TRẬN PHÂN QUYỀN (ROLE & PERMISSION MATRIX)
## SMART NEIGHBORHOOD – 4 VAI TRÒ CHUẨN HÓA

---

## 1. ĐỊNH NGHĨA 4 VAI TRÒ HỆ THỐNG

| Mã Role (Backend Enum) | Tên hiển thị | Phạm vi dữ liệu | Mô tả trách nhiệm |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Super Admin | Toàn hệ thống (Đa tổ dân phố) | Quản trị viên cấp Phường/Hệ thống: tạo tổ dân phố, phân công Tổ trưởng, xử lý yêu cầu xóa tài khoản, kiểm toán toàn hệ thống. |
| `LEADER` | Tổ trưởng tổ dân phố | Trong 1 `neighborhoodId` | Điều hành toàn bộ hoạt động trong tổ: quản lý hộ khẩu/cư dân, duyệt/ghim bài, ban hành thông báo, tạo sự kiện, tiếp nhận & phân công xử lý phản ánh, kiểm duyệt chat. |
| `STAFF` | Cán bộ / Nhân viên được phân công | Trong 1 `neighborhoodId` | Cán bộ phụ trách (Tổ phó, Cảnh sát KV, Y tế, Trật tự): hỗ trợ quản lý cư dân, đăng thông báo chuyên môn, xử lý phản ánh được giao, tạo sự kiện. |
| `RESIDENT` | Cư dân | Dữ liệu công khai trong tổ + dữ liệu cá nhân/hộ của mình | Đọc bảng tin, đăng bài đời sống, gửi phản ánh (công khai/riêng tư), đăng ký sự kiện, xem hộ gia đình của mình, nhắn tin cộng đồng. |

*(Ghi chú di chuyển từ enum cũ: gộp `TO_PHO`, `CAN_BO`, `CANH_SAT_KV` thành `STAFF` kèm thuộc tính chuyên trách `staffTitle`, giữ `TO_TRUONG` → `LEADER`, `CU_DAN` → `RESIDENT`, `SUPER_ADMIN` → `SUPER_ADMIN` để khớp đúng 4 vai trò yêu cầu).*

---

## 2. MA TRẬN PHÂN QUYỀN CHI TIẾT THEO MODULE & HÀNH ĐỘNG

| Module | Hành động / Nghiệp vụ | Super Admin | Tổ trưởng (`LEADER`) | Cán bộ (`STAFF`) | Cư dân (`RESIDENT`) | Quy tắc kiểm tra Backend |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **M1: Bảng tin** | Xem bài viết công khai trong tổ | ✅ | ✅ | ✅ | ✅ | `neighborhoodId === user.neighborhoodId` |
| | Đăng bài đời sống (`LIFE`) | ✅ | ✅ | ✅ | ✅ | Mọi user thuộc tổ |
| | Đăng bài cảnh báo chính thức (`isOfficial`) | ✅ | ✅ | ✅ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER, STAFF)` |
| | Ghim / Bỏ ghim bài viết | ✅ | ✅ | ❌ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER)` |
| | Xóa bài viết bất kỳ trong tổ | ✅ | ✅ | ❌ | ❌ (Chỉ bài của mình) | Service kiểm tra `authorId === user.id \|\| role in [LEADER, SUPER_ADMIN]` |
| | Bình luận & Thả biểu cảm | ✅ | ✅ | ✅ | ✅ | Mọi user thuộc tổ |
| | Gửi báo cáo sự cố (`PUBLIC` / `PRIVATE`) | ✅ | ✅ | ✅ | ✅ | Mọi user thuộc tổ |
| | Xem danh sách & chi tiết phản ánh `PRIVATE` | ✅ | ✅ | ✅ (Nếu được phân công) | ❌ (Chỉ xem bài mình gửi) | Query filter ở `ReportsRepository` |
| | Tiếp nhận, phân công & đổi trạng thái phản ánh | ✅ | ✅ | ✅ (Phản ánh được giao) | ❌ | `RolesGuard` + kiểm tra `assignedToId` |
| **M2: Thông báo & Sự kiện** | Xem thông báo & sự kiện của tổ | ✅ | ✅ | ✅ | ✅ | `neighborhoodId === user.neighborhoodId` |
| | Đăng thông báo chính thức & Push Notification | ✅ | ✅ | ✅ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER, STAFF)` |
| | Xem thống kê cư dân đã đọc thông báo | ✅ | ✅ | ✅ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER, STAFF)` |
| | Tạo / Sửa / Hủy sự kiện cộng đồng | ✅ | ✅ | ✅ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER, STAFF)` |
| | Đăng ký / Hủy tham gia sự kiện | ✅ | ✅ | ✅ | ✅ | Tự đăng ký cho tài khoản của mình |
| **M3: Quản lý cư dân** | Xem danh sách toàn bộ hộ gia đình & nhân khẩu | ✅ | ✅ | ✅ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER, STAFF)` |
| | Xem thông tin hộ gia đình của chính mình | ✅ | ✅ | ✅ | ✅ | `HouseholdMember.userId === user.id` |
| | Tạo hộ gia đình, thêm/sửa thành viên, đổi chủ hộ | ✅ | ✅ | ✅ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER, STAFF)` + ghi `AuditLog` |
| | Xem số CCCD đầy đủ (không mask) | ✅ | ✅ | ❌ (Masked) | ❌ (Chỉ xem của mình) | DTO Serialization theo Role |
| **M4: Bản đồ cộng đồng** | Xem điểm phản ánh `PUBLIC`, sự kiện, tiện ích | ✅ | ✅ | ✅ | ✅ | Chỉ trả `visibility = PUBLIC`, ẩn PII người gửi |
| | Xem vị trí chính xác phản ánh `PRIVATE` | ❌ (Không hiện trên bản đồ công khai) | ❌ (Xem trong M1) | ❌ (Xem trong M1) | ❌ | Tách biệt hoàn toàn khỏi API Bản đồ |
| **M5: Kết nối cộng đồng** | Nhắn tin 1-1 với cán bộ phụ trách | ✅ | ✅ | ✅ | ✅ | Luôn cho phép cư dân liên hệ cán bộ tổ |
| | Nhắn tin 1-1 giữa các cư dân | ✅ | ✅ | ✅ | ✅ (Theo cài đặt privacy) | Kiểm tra `UserSetting.allowDirectMessage` của người nhận |
| | Tạo nhóm chat cộng đồng / nhóm ngõ | ✅ | ✅ | ✅ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER, STAFF)` |
| | Báo cáo tin nhắn vi phạm | ✅ | ✅ | ✅ | ✅ | Thành viên cuộc trò chuyện |
| | Kiểm duyệt / Ẩn tin nhắn vi phạm | ✅ | ✅ | ❌ | ❌ | `RolesGuard(SUPER_ADMIN, LEADER)` + ghi `AuditLog` |
| **M6: Tài khoản cá nhân** | Quản lý hồ sơ, cài đặt, lịch sử, đổi mật khẩu | ✅ | ✅ | ✅ | ✅ | Chỉ thao tác trên `user.id` của chính mình |
| | Gửi yêu cầu xóa tài khoản | ❌ | ✅ | ✅ | ✅ | Tạo `AccountDeletionRequest` |
| | Duyệt xóa tài khoản & quản lý đa tổ | ✅ | ❌ | ❌ | ❌ | `RolesGuard(SUPER_ADMIN)` |

