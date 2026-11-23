# ĐÁNH GIÁ MỨC ĐỘ SẴN SÀNG TRIỂN KHAI 7 MODULE
## (MODULE READINESS & FEASIBILITY REPORT)

- **Dự án:** Quản Lý Tổ Dân Phố
- **Tài liệu:** `MODULE_READINESS.md`
- **Phiên bản:** 1.0.0

---

## 1. BẢNG TỔNG HỢP MỨC ĐỘ SẴN SÀNG (READINESS SCORECARD)

| STT | Module nghiệp vụ | Tình trạng hiện tại | Điểm khả thi kỹ thuật | Mức độ phụ thuộc (Dependency) | Điều kiện bắt đầu |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **7** | Cá nhân, Tài khoản & Xác thực | Chưa triển khai | 9.8 / 10 | Độc lập (Foundation Module) | **ĐỦ ĐIỀU KIỆN (Ưu tiên 1)** |
| **3** | Quản lý cư dân & Hộ khẩu | Chưa triển khai | 9.5 / 10 | Phụ thuộc Module 7 | **ĐỦ ĐIỀU KIỆN (Ưu tiên 2)** |
| **2** | Thông báo và sự kiện | Chưa triển khai | 9.6 / 10 | Phụ thuộc Module 7, 3 | Chờ hoàn thành Module 7 & 3 |
| **1** | Bảng tin cộng đồng | Chưa triển khai | 9.4 / 10 | Phụ thuộc Module 7, 3 | Chờ hoàn thành Module 7 & 3 |
| **4** | Quản lý thu chi & Đóng góp | Chưa triển khai | 9.2 / 10 | Phụ thuộc Module 7, 3 (Hộ gia đình) | Chờ hoàn thành Module 3 |
| **5** | Bản đồ cộng đồng & Tiện ích | Chưa triển khai | 9.0 / 10 | Phụ thuộc Module 7 | Triển khai song song giai đoạn 2 |
| **6** | Kết nối cộng đồng & Phản ánh | Chưa triển khai | 9.1 / 10 | Phụ thuộc Module 7, 3 | Triển khai song song giai đoạn 2 |

---

## 2. PHÂN TÍCH CHI TIẾT TỪNG MODULE

### 2.1. Module 7: Cá nhân, Tài khoản & Xác thực (Profile, Account & Auth)
- **Frontend đã có:** Chưa có. Cần dựng màn hình Đăng nhập (Số điện thoại + Mật khẩu), Màn hình Đổi mật khẩu, Trang Hồ sơ cá nhân (Hiển thị quyền hạn, tổ dân phố, số điện thoại, cài đặt thông báo).
- **Backend đã có:** Chưa có. Cần viết `AuthModule`, `UsersModule`, JWT Service, Bcrypt/Argon2 hashing service, Refresh Token rotation logic.
- **Database đã có:** Đã có bản thiết kế model `User`, `ToDanPho`, `DeviceToken`, `AuditLog`.
- **API đã có:** Đã có đặc tả 6 endpoints REST trong `API_AUDIT.md`.
- **Authentication & Phân quyền:** Là trung tâm cấp phát token và phân quyền 6 cấp bậc (`SUPER_ADMIN`, `TO_TRUONG`, `TO_PHO`, `CAN_BO`, `CANH_SAT_KV`, `CU_DAN`).
- **Thành phần còn thiếu:** Khởi tạo `expo-secure-store`, cấu hình Axios Interceptors tự động refresh token trên client, thiết lập `JwtAuthGuard` trên server.
- **Rủi ro kỹ thuật:** Token desynchronization khi mạng chập chờn; rủi ro brute-force mã PIN/mật khẩu. Đã có phương án Rate Limit và Secure Storage.
- **Công việc cần thực hiện:**
  1. Cài đặt các gói auth: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `argon2`.
  2. Xây dựng Controller & Service đăng nhập, đăng xuất, cấp mới token.
  3. Xây dựng giao diện Đăng nhập và Trang hồ sơ trên React Native với Expo Router.
- **Kết luận:** **Đủ điều kiện bắt đầu ngay lập tức (P0).**

---

### 2.2. Module 3: Quản lý cư dân & Hộ khẩu (Resident & Household Management)
- **Frontend đã có:** Chưa có. Cần màn hình: Danh sách hộ gia đình (cho Tổ trưởng/CSKV có thanh tìm kiếm số nhà), Màn hình Chi tiết Sổ hộ khẩu (danh sách nhân khẩu, mối quan hệ), Màn hình Thêm/Sửa nhân khẩu, Màn hình Xem sổ hộ cá nhân (cho Cư dân).
- **Backend đã có:** Chưa có. Cần viết `ResidentsModule`, `HouseholdsModule`.
- **Database đã có:** Đã có thiết kế model `Household`, `Resident`, enum `HouseholdRelation`, `ResidenceStatus`.
- **API đã có:** Đã có đặc tả 7 endpoints REST.
- **Authentication & Phân quyền:** Cư dân chỉ xem được hộ gia đình mình; Ban điều hành và Cảnh sát khu vực được quyền tra cứu toàn bộ danh sách trong tổ.
- **Thành phần còn thiếu:** Logic kiểm tra tính duy nhất của số CCCD 12 số; logic phân loại Thường trú/Tạm trú.
- **Rủi ro kỹ thuật:** Nhập liệu sai sót hoặc trùng lặp nhân khẩu giữa các hộ.
- **Công việc cần thực hiện:**
  1. Xây dựng CRUD Sổ hộ khẩu và Nhân khẩu trên Backend.
  2. Thiết kế giao diện danh sách thẻ hộ gia đình mượt mà với FlatList tối ưu hóa.
- **Kết luận:** **Đủ điều kiện triển khai ngay sau khi hoàn thành Module 7.**

---

### 2.3. Module 2: Thông báo và Sự kiện (Announcements & Events)
- **Frontend đã có:** Chưa có. Cần màn hình: Hộp thư thông báo (Badge phân loại Khẩn cấp/Quan trọng/Thường), Màn hình Chi tiết thông báo có nút "Đã đọc", Lịch sự kiện và nút "Đăng ký tham gia".
- **Backend đã có:** Chưa có. Cần `NotificationModule`, `EventsModule`, tích hợp Expo Push Notification Service.
- **Database đã có:** Đã có model `Announcement`, `AnnouncementReadReceipt`, `Event`, `EventAttendee`.
- **API đã có:** Đã có đặc tả 7 endpoints.
- **Authentication & Phân quyền:** Chỉ Ban điều hành mới được tạo thông báo; mọi cư dân đều nhận được và gửi biên nhận đã đọc.
- **Thành phần còn thiếu:** Cấu hình Expo Push Notification Credentials và SDK gửi tin nhắn đẩy hàng loạt.
- **Rủi ro kỹ thuật:** Thiết bị tắt quyền thông báo hoặc rơi vào chế độ tiết kiệm pin (Doze Mode) trên Android. Cần kết hợp WebSocket realtime khi app đang mở.
- **Công việc cần thực hiện:** Tích hợp Expo Push Server SDK; xây dựng giao diện đọc thông báo và xác nhận đã đọc.
- **Kết luận:** **Sẵn sàng triển khai ở Giai đoạn 2.**

---

### 2.4. Module 1: Bảng tin cộng đồng (Community Feed)
- **Frontend đã có:** Chưa có. Cần màn hình: Feed cuộn vô tận, Form tạo bài viết có chọn nhiều ảnh, Khung bình luận dạng Bottom Sheet, Nút thả tim/biểu cảm tương tác.
- **Backend đã có:** Chưa có. Cần `FeedModule`, upload service xử lý nén ảnh bài đăng.
- **Database đã có:** Đã có model `Post`, `PostMedia`, `Comment`, `PostReaction`.
- **API đã có:** Đã có đặc tả 7 endpoints.
- **Authentication & Phân quyền:** Mọi cư dân đã xác thực trong tổ đều được đăng bài và bình luận; Tổ trưởng có quyền duyệt hoặc ghim bài.
- **Thành phần còn thiếu:** Tối ưu hóa render danh sách nhiều ảnh trên mobile (tránh tràn RAM).
- **Rủi ro kỹ thuật:** Cư dân đăng tải nội dung không phù hợp hoặc ảnh dung lượng quá lớn gây chậm mạng. Cần nén ảnh tự động trước khi tải lên.
- **Công việc cần thực hiện:** Tích hợp TanStack Query `useInfiniteQuery`; xây dựng feed card component.
- **Kết luận:** **Sẵn sàng triển khai ở Giai đoạn 2.**

---

### 2.5. Module 4: Quản lý thu chi và đóng góp (Finance & Contributions)
- **Frontend đã có:** Chưa có. Cần màn hình: Danh sách các quỹ vận động, Báo cáo minh bạch thu chi công khai, Màn hình Thanh toán/Ủng hộ sinh mã VietQR động, Lịch sử biên lai đã đóng.
- **Backend đã có:** Chưa có. Cần `FinanceModule`, thuật toán sinh chuỗi thanh toán VietQR chuẩn Napas 247.
- **Database đã có:** Đã có model `FundCampaign`, `ContributionRecord`, `ExpenseRecord`.
- **API đã có:** Đã có đặc tả 8 endpoints.
- **Authentication & Phân quyền:** Ban điều hành lập quỹ và ghi nhận phiếu chi; Cư dân xem công khai và thực hiện nộp tiền cho hộ của mình.
- **Thành phần còn thiếu:** Template VietQR chuẩn ngân hàng (VietinBank/BIDV/Vietcombank/MBBank).
- **Rủi ro kỹ thuật:** Sai lệch số liệu kế toán hoặc đối soát chuyển khoản chậm. Đã có mô hình trạng thái PENDING -> COMPLETED kèm biên lai duy nhất.
- **Công việc cần thực hiện:** Xây dựng module tính toán số dư quỹ và sinh mã VietQR.
- **Kết luận:** **Sẵn sàng triển khai ở Giai đoạn 3 (sau khi có dữ liệu Hộ gia đình).**

---

### 2.6. Module 5: Bản đồ cộng đồng & Tiện ích (Community Map)
- **Frontend đã có:** Chưa có. Cần màn hình: Bản đồ số (sử dụng `react-native-maps`), các Marker điểm tiện ích (Trụ cứu hỏa, Nhà văn hóa, Trạm y tế), Lớp phủ ranh giới tổ (Polygon GeoJSON).
- **Backend đã có:** Chưa có. Cần `MapModule` lưu tọa độ GIS (latitude, longitude, GeoJSON boundary).
- **Database đã có:** Đã có model `CommunityPlace`, `PlaceCategory`.
- **API đã có:** Đã có đặc tả 3 endpoints.
- **Authentication & Phân quyền:** Tất cả người dùng trong tổ đều được tra cứu vị trí tiện ích; Ban điều hành có quyền thêm/chỉnh sửa vị trí tiện ích.
- **Thành phần còn thiếu:** Cấu hình Google Maps API Key cho Android và Apple Maps cho iOS.
- **Rủi ro kỹ thuật:** Cần cấp quyền truy cập vị trí người dùng (`ACCESS_FINE_LOCATION`).
- **Công việc cần thực hiện:** Tích hợp thư viện bản đồ và render markers.
- **Kết luận:** **Sẵn sàng triển khai ở Giai đoạn 3.**

---

### 2.7. Module 6: Kết nối cộng đồng & Phản ánh Hiện trường (Community Connect & Services)
- **Frontend đã có:** Chưa có. Cần màn hình: Danh sách phản ánh cộng đồng, Form chụp ảnh hiện trường và gửi kiến nghị, Trạng thái giải quyết (Timeline xử lý), Nút Báo động khẩn cấp (SOS).
- **Backend đã có:** Chưa có. Cần `ConnectModule`, `EmergencyGateway` (Socket.IO).
- **Database đã có:** Đã có model `CommunityRequest`, `RequestStatus`.
- **API đã có:** Đã có đặc tả 5 endpoints và kênh WebSocket khẩn cấp.
- **Authentication & Phân quyền:** Cư dân gửi phản ánh; Cán bộ/Tổ trưởng/CSKV tiếp nhận và cập nhật tiến độ giải quyết.
- **Thành phần còn thiếu:** Xử lý upload ảnh chứng cứ hiện trường và phát âm thanh chuông báo động khẩn cấp khi có tin nhắn SOS.
- **Rủi ro kỹ thuật:** Báo động giả; spam tin phản ánh không đúng sự thật. Cần cơ chế lưu nhật ký người gửi (AuditLog) để xử lý trách nhiệm.
- **Công việc cần thực hiện:** Xây dựng workflow chuyển đổi trạng thái phản ánh hiện trường.
- **Kết luận:** **Sẵn sàng triển khai ở Giai đoạn 3.**

---

## 3. SƠ ĐỒ PHỤ THUỘC GIỮA CÁC MODULE (DEPENDENCY GRAPH)

```
[Môi trường & Kiến trúc Monorepo]
               │
               ▼
   [Module 7: Auth & Tài khoản & Đa tổ]  <── (Mỏ neo an ninh)
               │
               ▼
   [Module 3: Quản lý Cư dân & Hộ khẩu] <── (Mỏ neo dữ liệu con người)
         ┌─────┴───────────────────────┐
         ▼                             ▼
[Module 2: Thông báo]        [Module 4: Thu chi & Quỹ]
[Module 1: Bảng tin]                   │
         │                             │
         └──────────────┬──────────────┘
                        ▼
         [Module 5: Bản đồ cộng đồng]
         [Module 6: Phản ánh & Kết nối]
```

