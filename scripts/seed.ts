import { prisma } from '../src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) throw new Error("No ADMIN user found in database!");
  const userId = user.id;

  console.log(`Clearing old records first...`);
  await prisma.record.deleteMany({}); // Start fresh to prevent crowding

  console.log(`Seeding database with 300 random records for user: ${userId}`);

  const categoriesExpense = ['FOOD', 'UTILITIES', 'TRANSPORT', 'SOFTWARE', 'ENTERTAINMENT', 'TRAVEL'];
  const categoriesIncome = ['SALARY', 'FREELANCE', 'DIVIDENDS'];

  const dummyRecords = [];
  const now = new Date();
  
  for (let i = 0; i < 300; i++) {
    const isExpense = Math.random() > 0.3; // 70% expenses, 30% income
    const category = isExpense 
      ? categoriesExpense[Math.floor(Math.random() * categoriesExpense.length)]
      : categoriesIncome[Math.floor(Math.random() * categoriesIncome.length)];
      
    // Random date within the last 365 days
    const date = new Date(now.getTime() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
    
    dummyRecords.push({
      amount: isExpense ? parseFloat((Math.random() * 200 + 10).toFixed(2)) : parseFloat((Math.random() * 2000 + 500).toFixed(2)),
      type: isExpense ? 'EXPENSE' as const : 'INCOME' as const,
      category,
      date,
      notes: `Generated ${category} transaction`,
      userId,
    });
  }

  // Bulk insert for speed
  const result = await prisma.record.createMany({
    data: dummyRecords
  });

  console.log(`Successfully created ${result.count} records!`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
