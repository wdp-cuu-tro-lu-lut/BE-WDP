
import { AppDataSource } from '../ormconfig';
import { Team, Account, RescueAssignment, RescueRequest } from '../database/entities';

async function checkData() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const accountRepository = AppDataSource.getRepository(Account);
  const teamRepository = AppDataSource.getRepository(Team);
  const assignmentRepository = AppDataSource.getRepository(RescueAssignment);

  console.log('Checking Data...');

  // 1. Check Team Account
  const teamAccount = await accountRepository.findOne({ where: { email: 'team@example.com' } });
  if (!teamAccount) {
    console.error('❌ Team account (team@example.com) NOT FOUND');
    return;
  }
  console.log(`✓ Found Team account: ${teamAccount.id}`);

  // 2. Check Team
  const team = await teamRepository.findOne({ where: { accountId: teamAccount.id } });
  if (!team) {
    console.error(`❌ Team linked to account ${teamAccount.id} NOT FOUND`);
    
    // Debug: List all teams
    const allTeams = await teamRepository.find();
    console.log('Available teams:', allTeams.map(t => ({ id: t.id, name: t.name, accountId: t.accountId })));
    return;
  }
  console.log(`✓ Found Team: ${team.name} (ID: ${team.id}) linked to Account: ${team.accountId}`);

  // 3. Check Assignments
  const assignments = await assignmentRepository.find({ where: { teamId: team.id }, relations: ['rescueRequest'] });
  console.log(`✓ Found ${assignments.length} assignments for team ${team.name}`);
  
  if (assignments.length === 0) {
      console.log('Debug: All assignments in DB:');
      const allAssignments = await assignmentRepository.find();
      console.log(allAssignments);
  } else {
      assignments.forEach(a => {
          console.log(` - Assignment ID: ${a.id}, Status: ${a.status}, RequestID: ${a.rescueRequestId}`);
      });
  }

  await AppDataSource.destroy();
}

checkData().catch(err => console.error(err));
