
import { AppDataSource } from '../ormconfig';
import { Team, Account, RescueAssignment } from '../database/entities';

async function fixAssignments() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const accountRepository = AppDataSource.getRepository(Account);
  const teamRepository = AppDataSource.getRepository(Team);
  const assignmentRepository = AppDataSource.getRepository(RescueAssignment);

  console.log('Fixing assignments...');

  // 1. Find the target team (managed by logged in user)
  const teamAccount = await accountRepository.findOne({ where: { email: 'team@example.com' } });
  if (!teamAccount) {
    console.error('❌ Team account (team@example.com) NOT FOUND');
    return;
  }
  
  const targetTeam = await teamRepository.findOne({ where: { accountId: teamAccount.id } });
  if (!targetTeam) {
    console.error(`❌ Team linked to account ${teamAccount.id} NOT FOUND`);
    return;
  }
  console.log(`✓ Target Team: ${targetTeam.name} (ID: ${targetTeam.id})`);

  // 2. Find all assignments
  const assignments = await assignmentRepository.find();
  console.log(`Found ${assignments.length} assignments to update.`);

  if (assignments.length === 0) {
      console.log('No assignments to fix.');
  } else {
      // 3. Update all to point to targetTeam
      for (const assignment of assignments) {
          assignment.teamId = targetTeam.id;
          await assignmentRepository.save(assignment);
      }
      console.log(`✓ Updated ${assignments.length} assignments to team ${targetTeam.name}`);
  }

  await AppDataSource.destroy();
}

fixAssignments().catch(err => console.error(err));
