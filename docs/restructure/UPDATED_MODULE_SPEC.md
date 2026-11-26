# ĐẶC TẢ 6 MODULE CHỨC NĂNG SAU TÁI CẤU TRÚC
## (UPDATED MODULE SPECIFICATION)

- **Hệ thống:** Smart Neighborhood – Ứng dụng Quản lý Tổ dân phố
- **Thay đổi trọng tâm:** Loại bỏ hoàn toàn *Quản lý thu chi và đóng góp*; chuẩn hóa thành **6 Module cốt lõi** gắn liền với phân quyền 4 vai trò và cấu trúc Navigation tối ưu.

---

## MODULE 1: BẢNG TIN CỘNG ĐỒNG (COMMUNITY FEED & INCIDENT REPORTS)
*Trạng thái hiện tại: Đã có khung giao diện & API bài viết cơ bản — Cần mở rộng thêm luồng Báo cáo sự cố, phân loại, trạng thái xử lý và phân quyền công khai/riêng tư.*

### Chức năng chi tiết:
1. **Đăng bài cộng đồng & Cảnh báo:**
   - Cư dân đăng bài chia sẻ đời sống; Tổ trưởng/Cán bộ đăng bài cảnh báo chính thức (gắn nhãn Official).
   - Hỗ trợ đính kèm nhiều ảnh (`Attachments`), phân loại bài viết (`LIFE` - Đời sống, `WARNING` - Cảnh báo, `EVENT_RECAP` - Hoạt động tổ, `REPORT` - Phản ánh sự cố).
2. **Báo cáo sự cố / Vấn đề khu dân cư:**
   - Tích hợp từ luồng *Phản ánh dân sinh* (hỗ trợ chụp ảnh, gắn vị trí GPS, chọn mức độ công khai `PUBLIC` hoặc riêng tư `PRIVATE`).
   - **Theo dõi trạng thái xử lý phản ánh:** `PENDING` (Chờ tiếp nhận) → `IN_PROGRESS` (Đang xử lý) → `RESOLVED` (Đã giải quyết) / `REJECTED` (Từ chối), kèm lịch sử thay đổi (`ReportStatusHistory`) và ghi chú xử lý của cán bộ.
3. **Tương tác, Tìm kiếm & Lọc:**
   - Bình luận (`Comments`), thả cảm xúc (`LIKE`, `HEART`, `CLAP`).
   - Tìm kiếm theo từ khóa/tác giả; lọc theo danh mục bài viết, bài đã ghim, hoặc trạng thái xử lý phản ánh.
4. **Phân quyền hiển thị công khai & riêng tư:**
   - Bài viết/Phản ánh `PUBLIC`: Mọi cư dân trong cùng tổ dân phố xem được.
   - Phản ánh `PRIVATE` (an ninh nhạy cảm, mâu thuẫn nội bộ): Chỉ **người gửi**, **Tổ trưởng**, **Cán bộ được phân công** và **Super Admin** xem được.

---

## MODULE 2: THÔNG BÁO VÀ SỰ KIỆN (ANNOUNCEMENTS & EVENTS)
*Trạng thái hiện tại: Chưa hoàn thành (mới có màn hình chờ & Prisma model cơ bản).*

### Chức năng chi tiết:
1. **Thông báo chính thức từ tổ dân phố:**
   - Ban hành thông báo hành chính theo mức độ (`NORMAL`, `IMPORTANT`, `URGENT`), hỗ trợ tệp đính kèm (PDF/ảnh văn bản).
   - **Thông báo quan trọng được ghim:** Hiển thị nổi bật trên đầu danh sách và trang chủ.
2. **Theo dõi trạng thái đã đọc:**
   - Cư dân bấm xác nhận "Đã đọc" (`AnnouncementReadReceipt`). Tổ trưởng xem tỷ lệ hộ/cư dân đã đọc.
3. **Lịch sự kiện cộng đồng & Đăng ký tham gia:**
   - Hiển thị lịch họp tổ, ngày hội, chiến dịch tiêm chủng/vệ sinh theo ngày/tháng.
   - Cư dân đăng ký tham gia (`REGISTERED` / `CANCELLED`) hoặc điểm danh (`ATTENDED`).
4. **Thông báo đẩy (Push Notification):**
   - Gửi thông báo đẩy qua **FCM / Expo Push** đến đúng đối tượng cư dân trong cùng tổ dân phố (hoặc nhóm đối tượng được chọn).

---

## MODULE 3: QUẢN LÝ CƯ DÂN (RESIDENT & HOUSEHOLD MANAGEMENT)
*Trạng thái hiện tại: Chưa hoàn thành (mới có màn hình chờ & model `Household`/`Resident`).*

### Chức năng chi tiết:
1. **Quản lý hộ gia đình & Chủ hộ:**
   - Tạo, cập nhật thông tin hộ gia đình (mã hộ, số nhà, đường/ngõ, tọa độ nhà), chỉ định và thay đổi Chủ hộ (`isHead`).
2. **Quản lý thành viên trong hộ & Thông tin cư trú:**
   - Thêm/sửa thành viên trong hộ, quan hệ với chủ hộ (`CHU_HO`, `VO_CHONG`, `CON`, `BO_ME`, `NGUOI_THUE`,...).
   - Quản lý trạng thái cư trú (`THUONG_TRU`, `TAM_TRU`, `TAM_VANG`, `LUU_TRU`, `DA_CHUYEN_DI`) kèm thời hạn tạm trú/tạm vắng.
3. **Tìm kiếm, Lọc & Kiểm soát PII:**
   - Ban điều hành tìm kiếm theo tên, số nhà, mã hộ, trạng thái cư trú.
   - Phân quyền chặt chẽ: Cư dân **chỉ xem được thông tin hộ gia đình của chính mình**, không được xem danh sách hay số CCCD của hộ khác.

---

## MODULE 4: BẢN ĐỒ CỘNG ĐỒNG (COMMUNITY MAP)
*Trạng thái hiện tại: Cần sửa & Mở rộng (chuyển từ bản đồ điểm tiện ích cũ sang bản đồ sự cố, sự kiện & thông tin cộng đồng).*

### Chức năng chi tiết:
1. **Hiển thị Phản ánh công khai & Sự kiện trên bản đồ:**
   - Ghim (Marker) các phản ánh sự cố có chế độ `PUBLIC` (hỏng đèn đường, ngập úng, rác thải...) theo tọa độ GPS.
   - Ghim vị trí tổ chức **Sự kiện cộng đồng** và các **điểm thông tin cộng đồng** (Nhà văn hóa, Trạm y tế, Điểm cứu hỏa).
2. **Bộ lọc bản đồ:**
   - Lọc theo danh mục (Sự cố hạ tầng, Vệ sinh, An ninh, Sự kiện, Tiện ích).
   - Lọc theo trạng thái xử lý phản ánh (`Chờ tiếp nhận`, `Đang xử lý`, `Đã giải quyết`).
3. **Xem chi tiết & Bảo vệ quyền riêng tư tuyệt đối:**
   - Chạm vào marker để mở Bottom Sheet xem chi tiết phản ánh/sự kiện.
   - **Quy tắc bảo mật bắt buộc (lọc từ Backend DTO):**
     - **KHÔNG** trả về tọa độ/ghim của các phản ánh `PRIVATE` ra API bản đồ công khai.
     - **KHÔNG** tiết lộ họ tên, số điện thoại, avatar hay thông tin cá nhân của người gửi phản ánh trên bản đồ công khai.

---

## MODULE 5: KẾT NỐI CỘNG ĐỒNG (COMMUNITY MESSAGING & CHAT)
*Trạng thái hiện tại: Tái cấu trúc hoàn toàn (bỏ luồng SOS/thuê dịch vụ cũ, tập trung vào hệ thống Nhắn tin Realtime).*

### Chức năng chi tiết:
1. **Nhắn tin cá nhân (1-1) & Trao đổi Cư dân – Cán bộ:**
   - Kênh trao đổi trực tiếp giữa cư dân và Tổ trưởng / Cán bộ phụ trách (ví dụ: hỏi thủ tục tạm trú, trao đổi về phản ánh).
   - Cho phép nhắn tin cá nhân giữa các thành viên (tuân thủ cài đặt quyền riêng tư của người nhận).
2. **Nhắn tin nhóm (Group Chat):**
   - Nhóm chat theo Tổ dân phố, nhóm Ngõ/Khu vực, hoặc nhóm Ban điều hành (phân quyền ai được tạo nhóm).
3. **Đính kèm hình ảnh, tệp & Cập nhật Realtime:**
   - Gửi hình ảnh, tài liệu đính kèm (`Attachments`).
   - Truyền nhận tin nhắn, trạng thái đã xem theo thời gian thực qua **Socket.IO**.
4. **Báo cáo & Kiểm duyệt nội dung:**
   - Người dùng có thể báo cáo tin nhắn/nội dung vi phạm; Tổ trưởng/Super Admin có quyền kiểm duyệt, ẩn tin nhắn vi phạm hoặc khóa quyền nhắn tin của tài khoản spam.

---

## MODULE 6: TÀI KHOẢN CÁ NHÂN (PERSONAL ACCOUNT & SETTINGS)
*Trạng thái hiện tại: Chưa hoàn thành (mới có màn hình `profile/index.tsx` chứa Demo Role Switcher).*

### Chức năng chi tiết:
1. **Xác thực & Quản lý tài khoản:**
   - Đăng ký, Đăng nhập (Số điện thoại + Mật khẩu), Đổi mật khẩu, Đăng xuất (thu hồi Refresh Token).
   - **Yêu cầu xóa tài khoản:** Quy trình gửi yêu cầu vô hiệu hóa/xóa dữ liệu cá nhân tuân thủ chính sách App Store/Google Play (`AccountDeletionRequest` + Soft Delete).
2. **Hồ sơ cá nhân & Hộ gia đình của tôi:**
   - Cập nhật họ tên, ảnh đại diện; xem thông tin hộ gia đình và thành viên cùng hộ liên kết từ Module 3.
3. **Lịch sử cá nhân:**
   - Lịch sử bài đăng & phản ánh đã gửi (kèm trạng thái xử lý).
   - Lịch sử hoạt động (đăng ký sự kiện, tương tác).
4. **Cài đặt thông báo & Quyền riêng tư:**
   - Bật/tắt nhận push notification theo loại (Thông báo khẩn, Sự kiện, Tin nhắn, Phản ánh).
   - Cài đặt quyền riêng tư: Cho phép/chặn người lạ nhắn tin 1-1, ẩn số điện thoại với cư dân khác.

