import { AppDataSource } from '../../ormconfig';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  Account,
  Profile,
  Team,
  AccountRole,
  Event,
  EventType,
  EventStatus,
} from '../database/entities';

async function seed() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const accountRepository = AppDataSource.getRepository(Account);
  const profileRepository = AppDataSource.getRepository(Profile);
  const teamRepository = AppDataSource.getRepository(Team);
  const eventRepository = AppDataSource.getRepository(Event);

  console.log('Seeding database...');

  // Create Admin
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = new Account();
  admin.email = 'admin@example.com';
  admin.passwordHash = adminPasswordHash;
  admin.role = AccountRole.ADMIN;
  admin.isActive = true;
  const savedAdmin = await accountRepository.save(admin);

  const adminProfile = new Profile();
  adminProfile.accountId = savedAdmin.id;
  adminProfile.fullName = 'Admin User';
  adminProfile.address = 'Admin Address';
  await profileRepository.save(adminProfile);

  // Create Staff
  const staffPasswordHash = await bcrypt.hash('staff123', 10);
  const staff = new Account();
  staff.email = 'staff@example.com';
  staff.passwordHash = staffPasswordHash;
  staff.role = AccountRole.STAFF;
  staff.isActive = true;
  const savedStaff = await accountRepository.save(staff);

  const staffProfile = new Profile();
  staffProfile.accountId = savedStaff.id;
  staffProfile.fullName = 'Staff User';
  staffProfile.address = 'Staff Address';
  await profileRepository.save(staffProfile);

  // Create Rescue Team
  const teamPasswordHash = await bcrypt.hash('team123', 10);
  const teamAccount = new Account();
  teamAccount.email = 'team@example.com';
  teamAccount.passwordHash = teamPasswordHash;
  teamAccount.role = AccountRole.RESCUE_TEAM;
  teamAccount.isActive = true;
  const savedTeamAccount = await accountRepository.save(teamAccount);

  const teamProfile = new Profile();
  teamProfile.accountId = savedTeamAccount.id;
  teamProfile.fullName = 'Rescue Team Lead';
  teamProfile.address = 'Team Base';
  await profileRepository.save(teamProfile);

  // Create Team entity
  const team = new Team();
  team.name = 'Alpha Rescue Team';
  team.accountId = savedTeamAccount.id; // Link to account
  team.area = 'District 1, City';
  team.teamSize = 10;
  team.isActive = true;
  await teamRepository.save(team);

  // Create User
  const userPasswordHash = await bcrypt.hash('user123', 10);
  const user = new Account();
  user.email = 'user@example.com';
  user.passwordHash = userPasswordHash;
  user.role = AccountRole.USER;
  user.isActive = true;
  const savedUser = await accountRepository.save(user);

  const userProfile = new Profile();
  userProfile.accountId = savedUser.id;
  userProfile.fullName = 'Regular User';
  userProfile.address = 'User Address';
  await profileRepository.save(userProfile);

  // Create Sample Events
  const volunteerEvent = new Event();
  volunteerEvent.title = 'Volunteer Registration Event';
  volunteerEvent.description = 'Register to volunteer for rescue operations';
  volunteerEvent.type = EventType.VOLUNTEER;
  volunteerEvent.status = EventStatus.OPEN;
  volunteerEvent.startDate = new Date();
  volunteerEvent.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  volunteerEvent.location = 'Community Center';
  await eventRepository.save(volunteerEvent);

  const donationEvent = new Event();
  donationEvent.title = 'Donation Drive';
  donationEvent.description = 'Donate supplies for relief operations';
  donationEvent.type = EventType.DONATION;
  donationEvent.status = EventStatus.OPEN;
  donationEvent.startDate = new Date();
  donationEvent.endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  donationEvent.location = 'Donation Center';
  await eventRepository.save(donationEvent);

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
