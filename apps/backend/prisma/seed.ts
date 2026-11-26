import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Đang khởi tạo dữ liệu mẫu Smart Neighborhood trên PostgreSQL/Supabase...');

  // 1. Tạo Tổ dân phố số 5 - Phường 12
  const neighborhood = await prisma.neighborhood.upsert({
    where: { code: 'TDP-05-P12' },
    update: {},
    create: {
      id: 'tdp-05-p12',
      code: 'TDP-05-P12',
      name: 'Tổ dân phố số 5 - P.12',
      ward: 'Phường 12',
      district: 'Quận Bình Thạnh',
      city: 'TP. Hồ Chí Minh',
      isActive: true,
    },
  });

  // Mật khẩu mẫu chung cho dev/test: "123456"
  const defaultPasswordHash = await argon2.hash('123456');

  // 2. Tạo 4 tài khoản đại diện cho 4 vai trò chuẩn
  const leader = await prisma.user.upsert({
    where: { phoneNumber: '0987654321' },
    update: {},
    create: {
      id: 'user-leader-01',
      neighborhoodId: neighborhood.id,
      phoneNumber: '0987654321',
      passwordHash: defaultPasswordHash,
      fullName: 'Trần Thị Minh',
      role: 'LEADER',
      staffTitle: 'Tổ trưởng',
      setting: { create: {} },
    },
  });

  const staff = await prisma.user.upsert({
    where: { phoneNumber: '0944556677' },
    update: {},
    create: {
      id: 'user-staff-01',
      neighborhoodId: neighborhood.id,
      phoneNumber: '0944556677',
      passwordHash: defaultPasswordHash,
      fullName: 'Đại úy Vũ Đức Thắng',
      role: 'STAFF',
      staffTitle: 'Cảnh sát khu vực',
      setting: { create: {} },
    },
  });

  const resident = await prisma.user.upsert({
    where: { phoneNumber: '0912345678' },
    update: {},
    create: {
      id: 'user-resident-01',
      neighborhoodId: neighborhood.id,
      phoneNumber: '0912345678',
      passwordHash: defaultPasswordHash,
      fullName: 'Nguyễn Văn An',
      role: 'RESIDENT',
      setting: { create: {} },
    },
  });

  await prisma.user.upsert({
    where: { phoneNumber: '0999888777' },
    update: {},
    create: {
      id: 'user-admin-01',
      neighborhoodId: neighborhood.id,
      phoneNumber: '0999888777',
      passwordHash: defaultPasswordHash,
      fullName: 'Quản trị viên Phường',
      role: 'SUPER_ADMIN',
      setting: { create: {} },
    },
  });

  // 3. Tạo Hộ gia đình & Thành viên (Module 3)
  const household1 = await prisma.household.upsert({
    where: {
      neighborhoodId_code: {
        neighborhoodId: neighborhood.id,
        code: 'HK-2026-0001',
      },
    },
    update: {},
    create: {
      neighborhoodId: neighborhood.id,
      code: 'HK-2026-0001',
      houseNumber: '24',
      street: 'Ngõ 12, Đường Nơ Trang Long',
      latitude: 10.8124,
      longitude: 106.6981,
    },
  });

  const existingMember = await prisma.householdMember.findFirst({
    where: { householdId: household1.id, userId: resident.id },
  });
  if (!existingMember) {
    await prisma.householdMember.create({
      data: {
        householdId: household1.id,
        userId: resident.id,
        fullName: resident.fullName,
        cccdNumber: '079090001234',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'MALE',
        isHead: true,
        relationToHead: 'CHU_HO',
        residenceType: 'THUONG_TRU',
        residenceStatus: 'DANG_CU_TRU',
      },
    });
  }

  // 4. Tạo Bài viết Bảng tin (Module 1)
  const postCount = await prisma.post.count({
    where: { neighborhoodId: neighborhood.id },
  });

  if (postCount === 0) {
    const post1 = await prisma.post.create({
      data: {
        neighborhoodId: neighborhood.id,
        authorId: leader.id,
        category: 'EVENT_RECAP',
        visibility: 'PUBLIC',
        title: 'Phát động Ngày Chủ Nhật Xanh',
        content:
          'Kính gửi toàn thể bà con Tổ dân phố số 5! Sáng Chủ Nhật tuần này (07h00), Ban điều hành tổ phát động buổi Tổng vệ sinh môi trường tại các tuyến ngõ 12, 14 và khu vực Nhà văn hóa.',
        isPinned: true,
        isOfficial: true,
      },
    });

    await prisma.comment.create({
      data: {
        postId: post1.id,
        authorId: resident.id,
        content: 'Gia đình số nhà 24 ngõ 12 xin đăng ký 2 người tham gia ạ.',
      },
    });

    await prisma.reaction.create({
      data: {
        postId: post1.id,
        userId: resident.id,
        type: 'HEART',
      },
    });

    await prisma.post.create({
      data: {
        neighborhoodId: neighborhood.id,
        authorId: staff.id,
        category: 'WARNING',
        visibility: 'PUBLIC',
        title: 'Cảnh báo lừa đảo giả danh VNeID',
        content:
          'CẢNH BÁO AN NINH: Bà con tuyệt đối KHÔNG bấm vào đường link lạ tự xưng công an hướng dẫn kích hoạt VNeID, KHÔNG cung cấp mã OTP.',
        isPinned: false,
        isOfficial: true,
      },
    });
  }

  // 5. Tạo Phản ánh sự cố (Module 1 & Module 4 - Bản đồ)
  const reportCount = await prisma.report.count({
    where: { neighborhoodId: neighborhood.id },
  });

  if (reportCount === 0) {
    await prisma.report.create({
      data: {
        neighborhoodId: neighborhood.id,
        reporterId: resident.id,
        assignedToId: staff.id,
        category: 'LIGHTING',
        visibility: 'PUBLIC',
        title: 'Hỏng đèn chiếu sáng đầu ngõ 12',
        description: 'Trụ đèn số 3 đầu ngõ 12 bị tắt 2 hôm nay, buổi tối đi lại khá tối.',
        status: 'IN_PROGRESS',
        latitude: 10.8128,
        longitude: 106.6985,
        addressText: 'Đầu ngõ 12, Nơ Trang Long',
        statusHistory: {
          create: {
            changedById: leader.id,
            fromStatus: 'PENDING',
            toStatus: 'IN_PROGRESS',
            note: 'Đã chuyển tổ điện dân dụng kiểm tra thay bóng.',
          },
        },
      },
    });

    await prisma.report.create({
      data: {
        neighborhoodId: neighborhood.id,
        reporterId: resident.id,
        category: 'SECURITY',
        visibility: 'PRIVATE',
        title: 'Báo cáo tụ tập gây mất trật tự ban đêm',
        description: 'Phản ánh riêng tư gửi Cảnh sát khu vực xử lý.',
        status: 'PENDING',
        latitude: 10.8121,
        longitude: 106.6979,
        addressText: 'Cuối hẻm 14',
      },
    });
  }

  // 6. Tạo Thông báo & Sự kiện (Module 2)
  const announcementCount = await prisma.announcement.count({
    where: { neighborhoodId: neighborhood.id },
  });

  if (announcementCount === 0) {
    await prisma.announcement.create({
      data: {
        neighborhoodId: neighborhood.id,
        authorId: leader.id,
        title: 'Lịch cắt điện bảo trì lưới điện ngày 28/11',
        content: 'Điện lực thông báo tạm ngừng cung cấp điện từ 08h00 đến 11h30 ngày 28/11/2026 để bảo trì trạm biến áp.',
        priority: 'IMPORTANT',
        isPinned: true,
      },
    });

    await prisma.event.create({
      data: {
        neighborhoodId: neighborhood.id,
        organizerId: leader.id,
        title: 'Họp Tổ dân phố Quý IV/2026',
        description: 'Tổng kết công tác an ninh trật tự và bầu tổ trưởng nhiệm kỳ mới.',
        locationName: 'Nhà văn hóa Tổ dân phố số 5',
        latitude: 10.8130,
        longitude: 106.6990,
        startTime: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      },
    });
  }

  // 7. Tạo Điểm cộng đồng trên Bản đồ (Module 4)
  const placeCount = await prisma.communityPlace.count({
    where: { neighborhoodId: neighborhood.id },
  });

  if (placeCount === 0) {
    await prisma.communityPlace.create({
      data: {
        neighborhoodId: neighborhood.id,
        name: 'Nhà văn hóa Tổ dân phố số 5',
        category: 'NHA_VAN_HOA',
        address: 'Số 10 Ngõ 12, P.12, Q.Bình Thạnh',
        latitude: 10.8130,
        longitude: 106.6990,
      },
    });
  }

  console.log('Seed dữ liệu mẫu hoàn tất!');
}

main()
  .catch((e) => {
    console.error('Lỗi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

