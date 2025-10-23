import { prisma } from '../lib/prisma';

async function checkFeedback() {
  try {
    const feedback = await prisma.chatFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        dataset: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log('\n📊 Recent Feedback:\n');
    
    if (feedback.length === 0) {
      console.log('No feedback found yet.');
      return;
    }

    feedback.forEach((f, i) => {
      console.log(`${i + 1}. ${f.rating === 'POSITIVE' ? '👍' : '👎'} ${f.rating}`);
      console.log(`   User: ${f.user.email}`);
      console.log(`   Dataset: ${f.dataset.name}`);
      console.log(`   Query: ${f.userQuery.substring(0, 60)}...`);
      console.log(`   Response: ${f.messageContent.substring(0, 80)}...`);
      console.log(`   Time: ${f.createdAt.toISOString()}`);
      console.log('');
    });

    // Stats
    const total = await prisma.chatFeedback.count();
    const positive = await prisma.chatFeedback.count({ where: { rating: 'POSITIVE' } });
    const negative = await prisma.chatFeedback.count({ where: { rating: 'NEGATIVE' } });

    console.log('📈 Overall Stats:');
    console.log(`   Total: ${total}`);
    console.log(`   Positive: ${positive}`);
    console.log(`   Negative: ${negative}`);
    console.log(`   Satisfaction Rate: ${total > 0 ? ((positive / total) * 100).toFixed(1) : 0}%`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFeedback();

