import { PrismaClient, OrgRole } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Ensuring all users have organizations and memberships...')
  
  const users = await prisma.user.findMany({
    include: { memberships: { include: { org: true } } }
  })
  
  for (const user of users) {
    console.log(`Processing user: ${user.email}`)
    
    const existingMembership = await prisma.membership.findFirst({ 
      where: { userId: user.id } 
    })
    
    if (!existingMembership) {
      console.log(`📝 Creating organization and membership for ${user.email}`)
      
      // Create personal organization
      const orgName = `${user.name ?? user.email?.split('@')[0] ?? 'New'}'s Organization`
      const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
      
      const organization = await prisma.organization.create({
        data: { 
          name: orgName,
          slug: orgSlug,
        },
      })
      
      // Create membership
      await prisma.membership.create({
        data: { 
          userId: user.id, 
          orgId: organization.id, 
          role: 'OWNER' as OrgRole
        },
      })
      
      // Update user to reference the organization
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          organizationId: organization.id,
        }
      })
      
      console.log(`✅ Created org "${organization.name}" + OWNER membership for ${user.email}`)
    } else {
      console.log(`✅ ${user.email} already has membership`)
    }
  }
  
  const totalUsers = users.length
  const usersWithMemberships = await prisma.membership.count()
  
  console.log(`\n🎉 Summary:`)
  console.log(`   Total users: ${totalUsers}`)
  console.log(`   Users with memberships: ${usersWithMemberships}`)
  console.log(`   Repair complete!`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('🔄 Database connection closed')
  })
