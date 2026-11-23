// ==========================================
// ĐỊNH NGHĨA ENUMS & TYPES DÙNG CHUNG HỆ THỐNG
// ==========================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',     // Quản trị viên hệ thống cấp Phường/Quận
  TO_TRUONG = 'TO_TRUONG',         // Trưởng ban điều hành / Tổ trưởng tổ dân phố
  TO_PHO = 'TO_PHO',               // Tổ phó tổ dân phố
  CAN_BO = 'CAN_BO',               // Cán bộ phụ trách chuyên trách (y tế, trật tự, văn hóa)
  CANH_SAT_KV = 'CANH_SAT_KV',     // Cảnh sát khu vực phụ trách địa bàn
  CU_DAN = 'CU_DAN',               // Cư dân / Chủ hộ / Nhân khẩu
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum ResidenceStatus {
  THUONG_TRU = 'THUONG_TRU',       // Thường trú (Hộ khẩu cố định tại tổ)
  TAM_TRU = 'TAM_TRU',             // Tạm trú (Có đăng ký tạm trú hợp pháp)
  TAM_VANG = 'TAM_VANG',           // Tạm vắng (Thường trú nhưng đang tạm vắng)
  LUU_TRU = 'LUU_TRU',             // Lưu trú (Thuê nhà ngắn hạn, công nhân, sinh viên)
}

export enum HouseholdRelation {
  CHU_HO = 'CHU_HO',               // Chủ hộ
  VO_CHONG = 'VO_CHONG',           // Vợ / Chồng
  CON_DE = 'CON_DE',               // Con đẻ
  CON_NUOI = 'CON_NUOI',           // Con nuôi
  BO_ME = 'BO_ME',                 // Bố / Mẹ
  ONG_BA = 'ONG_BA',               // Ông / Bà
  CHAU = 'CHAU',                   // Cháu nội / Cháu ngoại
  ANH_CHI_EM = 'ANH_CHI_EM',       // Anh / Chị / Em
  NGUOI_THUE = 'NGUOI_THUE',       // Người thuê trọ
  KHAC = 'KHAC',                   // Mối quan hệ khác
}

export enum AnnouncementPriority {
  NORMAL = 'NORMAL',               // Bình thường (Thông tin sinh hoạt)
  IMPORTANT = 'IMPORTANT',         // Quan trọng (Lịch cắt điện nước, tiêm chủng)
  URGENT = 'URGENT',               // Khẩn cấp (Bão lũ, dịch bệnh, an ninh)
}

export enum FundType {
  BAT_BUOC = 'BAT_BUOC',           // Khoản thu bắt buộc (Phí vệ sinh, an ninh)
  TU_NGUYEN = 'TU_NGUYEN',         // Vận động quyên góp (Vì người nghèo, khuyến học)
}

export enum PaymentStatus {
  PENDING = 'PENDING',             // Chờ thanh toán / Chờ xác nhận
  COMPLETED = 'COMPLETED',         // Đã hoàn tất đóng nộp
  CANCELLED = 'CANCELLED',         // Đã hủy biên lai
}

export enum PaymentMethod {
  TIEN_MAT = 'TIEN_MAT',           // Tiền mặt (Nộp trực tiếp cho tổ trưởng/thủ quỹ)
  VIETQR = 'VIETQR',               // Chuyển khoản ngân hàng qua mã VietQR
  VNPAY = 'VNPAY',                 // Cổng thanh toán trực tuyến
}

export enum RequestStatus {
  CHO_TIEP_NHAN = 'CHO_TIEP_NHAN', // Mới gửi, chờ cán bộ tiếp nhận
  DANG_XU_LY = 'DANG_XU_LY',       // Đang trong quá trình xử lý, kiểm tra thực địa
  DA_XU_LY = 'DA_XU_LY',           // Đã giải quyết xong, có kết quả phản hồi
  TU_CHOI = 'TU_CHOI',             // Từ chối (Không thuộc thẩm quyền, sai sự thật)
}

export enum PlaceCategory {
  NHA_VAN_HOA = 'NHA_VAN_HOA',     // Nhà sinh hoạt cộng đồng / Nhà văn hóa
  TRAM_Y_TE = 'TRAM_Y_TE',         // Trạm y tế / Bệnh viện lân cận
  DIEM_RUC_RAC = 'DIEM_RUC_RAC',   // Điểm tập kết rác thải / Vệ sinh môi trường
  CAMERA_AN_NINH = 'CAMERA_AN_NINH', // Vị trí camera giám sát an ninh
  DIEM_CUU_HOA = 'DIEM_CUU_HOA',   // Trụ nước cứu hỏa / Bình chữa cháy công cộng
  DIEM_TRU_AN = 'DIEM_TRU_AN',     // Điểm tránh trú thiên tai, nhà lánh nạn khẩn cấp
}
