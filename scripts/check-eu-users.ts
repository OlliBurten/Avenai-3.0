import { prisma } from '../lib/prisma.js';

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      organizationId: true,
      accounts: {
        select: {
          provider: true,
        }
      }
    }
  });
  
  console.log('📊 Users in EU Database:\n');
  users.forEach(user => {
    console.log(`👤 ${user.email || 'No email'}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Org: ${user.organizationId}`);
    console.log(`   Auth: ${user.accounts.map(a => a.provider).join(', ') || 'None'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkUsers();

