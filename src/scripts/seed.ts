import { AppDataSource } from '../ormconfig';
import * as bcrypt from 'bcryptjs';
import {
  Account,
  Profile,
  Team,
  AccountRole,
  Event,
  EventType,
  EventStatus,
  Donation,
  DonationItem,
  Category,
  DonationStatus,
  ItemCondition,
} from '../database/entities';

async function seed() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const accountRepository = AppDataSource.getRepository(Account);
  const profileRepository = AppDataSource.getRepository(Profile);
  const teamRepository = AppDataSource.getRepository(Team);
  const eventRepository = AppDataSource.getRepository(Event);
  const donationRepository = AppDataSource.getRepository(Donation);
  const donationItemRepository = AppDataSource.getRepository(DonationItem);
  const categoryRepository = AppDataSource.getRepository(Category);

  console.log('Seeding database...');

  // Check if admin already exists
  let savedAdmin = await accountRepository.findOne({ where: { email: 'admin@example.com' } });
  
  if (!savedAdmin) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const admin = new Account();
    admin.email = 'admin@example.com';
    admin.passwordHash = adminPasswordHash;
    admin.role = AccountRole.ADMIN;
    admin.isActive = true;
    savedAdmin = await accountRepository.save(admin);

    const adminProfile = new Profile();
    adminProfile.accountId = savedAdmin.id;
    adminProfile.fullName = 'Admin User';
    adminProfile.address = 'Admin Address';
    await profileRepository.save(adminProfile);
    console.log('✓ Created Admin account');
  } else {
    console.log('→ Admin account already exists');
  }

  // Check if staff already exists
  let savedStaff = await accountRepository.findOne({ where: { email: 'staff@example.com' } });
  
  if (!savedStaff) {
    const staffPasswordHash = await bcrypt.hash('staff123', 10);
    const staff = new Account();
    staff.email = 'staff@example.com';
    staff.passwordHash = staffPasswordHash;
    staff.role = AccountRole.STAFF;
    staff.isActive = true;
    savedStaff = await accountRepository.save(staff);

    const staffProfile = new Profile();
    staffProfile.accountId = savedStaff.id;
    staffProfile.fullName = 'Staff User';
    staffProfile.address = 'Staff Address';
    await profileRepository.save(staffProfile);
    console.log('✓ Created Staff account');
  } else {
    console.log('→ Staff account already exists');
  }

  // Check if team account already exists
  let savedTeamAccount = await accountRepository.findOne({ where: { email: 'team@example.com' } });
  
  if (!savedTeamAccount) {
    const teamPasswordHash = await bcrypt.hash('team123', 10);
    const teamAccount = new Account();
    teamAccount.email = 'team@example.com';
    teamAccount.passwordHash = teamPasswordHash;
    teamAccount.role = AccountRole.RESCUE_TEAM;
    teamAccount.isActive = true;
    savedTeamAccount = await accountRepository.save(teamAccount);

    const teamProfile = new Profile();
    teamProfile.accountId = savedTeamAccount.id;
    teamProfile.fullName = 'Rescue Team Lead';
    teamProfile.address = 'Team Base';
    await profileRepository.save(teamProfile);

    const team = new Team();
    team.name = 'Alpha Rescue Team';
    team.accountId = savedTeamAccount.id;
    team.area = 'District 1, City';
    team.teamSize = 10;
    team.isActive = true;
    await teamRepository.save(team);
    console.log('✓ Created Rescue Team account');
  } else {
    console.log('→ Rescue Team account already exists');
  }

  // Check if user already exists
  let savedUser = await accountRepository.findOne({ where: { email: 'user@example.com' } });
  
  if (!savedUser) {
    const userPasswordHash = await bcrypt.hash('user123', 10);
    const user = new Account();
    user.email = 'user@example.com';
    user.passwordHash = userPasswordHash;
    user.role = AccountRole.USER;
    user.isActive = true;
    savedUser = await accountRepository.save(user);

    const userProfile = new Profile();
    userProfile.accountId = savedUser.id;
    userProfile.fullName = 'Regular User';
    userProfile.address = 'User Address';
    await profileRepository.save(userProfile);
    console.log('✓ Created User account');
  } else {
    console.log('→ User account already exists');
  }

  // Check if events already exist
  let volunteerEvent = await eventRepository.findOne({ where: { title: 'Volunteer Registration Event' } });
  
  if (!volunteerEvent) {
    volunteerEvent = new Event();
    volunteerEvent.title = 'Volunteer Registration Event';
    volunteerEvent.description = 'Register to volunteer for rescue operations';
    volunteerEvent.type = EventType.VOLUNTEER;
    volunteerEvent.status = EventStatus.OPEN;
    volunteerEvent.startDate = new Date();
    volunteerEvent.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    volunteerEvent.location = 'Community Center';
    await eventRepository.save(volunteerEvent);
    console.log('✓ Created Volunteer Event');
  } else {
    console.log('→ Volunteer Event already exists');
  }

  let donationEvent = await eventRepository.findOne({ where: { title: 'Donation Drive' } });
  
  if (!donationEvent) {
    donationEvent = new Event();
    donationEvent.title = 'Donation Drive';
    donationEvent.description = 'Donate supplies for relief operations';
    donationEvent.type = EventType.DONATION;
    donationEvent.status = EventStatus.OPEN;
    donationEvent.startDate = new Date();
    donationEvent.endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    donationEvent.location = 'Donation Center';
    await eventRepository.save(donationEvent);
    console.log('✓ Created Donation Event');
  } else {
    console.log('→ Donation Event already exists');
  }

  // Create Categories (Vietnamese)
  const categories = [
    { name: 'Thực phẩm khô' },
    { name: 'Nước uống' },
    { name: 'Quần áo' },
    { name: 'Thuốc men' },
    { name: 'Đồ dùng cá nhân' },
    { name: 'Đồ gia dụng' },
  ];

  const savedCategories: Record<string, Category> = {};
  for (const cat of categories) {
    let category = await categoryRepository.findOne({ where: { name: cat.name } });
    if (!category) {
      category = categoryRepository.create(cat);
      category = await categoryRepository.save(category);
      console.log(`✓ Created category: ${cat.name}`);
    } else {
      console.log(`→ Category already exists: ${cat.name}`);
    }
    savedCategories[cat.name] = category;
  }

  // Check if donations already exist
  const existingDonations = await donationRepository.count();
  
  if (existingDonations > 0) {
    console.log(`→ Database already has ${existingDonations} donation(s). Skipping sample donations.`);
  } else {
    console.log('Creating sample donations with items...');
    
    // Create Sample Donations with Items (Vietnamese data)
    const donation1 = donationRepository.create({
      eventId: donationEvent.id,
      creatorId: savedUser.id,
      status: DonationStatus.SUBMITTED,
      note: 'Quyên góp từ gia đình tôi để hỗ trợ người dân vùng lũ',
    });
    const savedDonation1 = await donationRepository.save(donation1);

    // Donation 1 Items
    const donation1Items = [
      {
        donationId: savedDonation1.id,
        categoryId: savedCategories['Thực phẩm khô'].id,
        name: 'Gạo ST25',
        unit: 'kg',
        quantity: 50,
        expirationDate: new Date('2026-12-31'),
        condition: ItemCondition.EXCELLENT,
        status: DonationStatus.SUBMITTED,
        note: 'Gạo ngon, còn mới niêm phong',
      },
      {
        donationId: savedDonation1.id,
        categoryId: savedCategories['Nước uống'].id,
        name: 'Nước suối Lavie',
        unit: 'thùng',
        quantity: 10,
        expirationDate: new Date('2027-06-30'),
        condition: ItemCondition.EXCELLENT,
        status: DonationStatus.SUBMITTED,
        note: 'Mỗi thùng 24 chai 500ml',
      },
      {
        donationId: savedDonation1.id,
        categoryId: savedCategories['Quần áo'].id,
        name: 'Áo phông cotton',
        unit: 'cái',
        quantity: 30,
        condition: ItemCondition.GOOD,
        status: DonationStatus.SUBMITTED,
        note: 'Áo đã qua sử dụng nhưng còn tốt, đã giặt sạch',
      },
    ];
    await donationItemRepository.save(donation1Items);

    const donation2 = donationRepository.create({
      eventId: donationEvent.id,
      creatorId: savedUser.id,
      status: DonationStatus.APPROVED,
      note: 'Quyên góp thuốc men và đồ dùng y tế',
    });
    const savedDonation2 = await donationRepository.save(donation2);

    // Donation 2 Items
    const donation2Items = [
      {
        donationId: savedDonation2.id,
        categoryId: savedCategories['Thuốc men'].id,
        name: 'Paracetamol 500mg',
        unit: 'hộp',
        quantity: 20,
        expirationDate: new Date('2027-03-15'),
        condition: ItemCondition.EXCELLENT,
        status: DonationStatus.APPROVED,
        note: 'Thuốc hạ sốt, giảm đau, mỗi hộp 100 viên',
      },
      {
        donationId: savedDonation2.id,
        categoryId: savedCategories['Thuốc men'].id,
        name: 'Betadine 30ml',
        unit: 'chai',
        quantity: 15,
        expirationDate: new Date('2026-11-20'),
        condition: ItemCondition.EXCELLENT,
        status: DonationStatus.APPROVED,
        note: 'Dung dịch sát trùng vết thương',
      },
      {
        donationId: savedDonation2.id,
        categoryId: savedCategories['Đồ dùng cá nhân'].id,
        name: 'Khẩu trang y tế',
        unit: 'hộp',
        quantity: 50,
        expirationDate: new Date('2028-01-01'),
        condition: ItemCondition.EXCELLENT,
        status: DonationStatus.APPROVED,
        note: 'Khẩu trang 4 lớp kháng khuẩn, mỗi hộp 50 cái',
      },
    ];
    await donationItemRepository.save(donation2Items);

    const donation3 = donationRepository.create({
      eventId: donationEvent.id,
      creatorId: savedUser.id,
      status: DonationStatus.RECEIVED,
      note: 'Đồ gia dụng và nhu yếu phẩm',
    });
    const savedDonation3 = await donationRepository.save(donation3);

    // Donation 3 Items
    const donation3Items = [
      {
        donationId: savedDonation3.id,
        categoryId: savedCategories['Đồ gia dụng'].id,
        name: 'Chăn mền cotton',
        unit: 'cái',
        quantity: 25,
        condition: ItemCondition.GOOD,
        status: DonationStatus.RECEIVED,
        note: 'Chăn đã qua sử dụng nhẹ, giặt sạch sẽ',
      },
      {
        donationId: savedDonation3.id,
        categoryId: savedCategories['Thực phẩm khô'].id,
        name: 'Mì gói Hảo Hảo',
        unit: 'thùng',
        quantity: 20,
        expirationDate: new Date('2026-09-30'),
        condition: ItemCondition.EXCELLENT,
        status: DonationStatus.RECEIVED,
        note: 'Mỗi thùng 30 gói',
      },
      {
        donationId: savedDonation3.id,
        categoryId: savedCategories['Nước uống'].id,
        name: 'Sữa tươi Vinamilk',
        unit: 'thùng',
        quantity: 15,
        expirationDate: new Date('2026-05-15'),
        condition: ItemCondition.EXCELLENT,
        status: DonationStatus.RECEIVED,
        note: 'Sữa tươi tiệt trùng 180ml, mỗi thùng 48 hộp',
      },
    ];
    await donationItemRepository.save(donation3Items);

    console.log('✓ Created 3 sample donations with total 9 items');
  }

  console.log('');
  console.log('Seeding completed successfully!');
  console.log('');
  console.log('Admin credentials:');
  console.log('  Email: admin@example.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Staff credentials:');
  console.log('  Email: staff@example.com');
  console.log('  Password: staff123');
  console.log('');
  console.log('Rescue Team credentials:');
  console.log('  Email: team@example.com');
  console.log('  Password: team123');
  console.log('');
  console.log('User credentials:');
  console.log('  Email: user@example.com');
  console.log('  Password: user123');

  await AppDataSource.destroy();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
