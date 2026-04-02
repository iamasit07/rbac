import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";

interface TrendRow {
  month: string;
  type: string;
  total: Prisma.Decimal;
}

function buildUserScope(userId: string, role: Role): Prisma.RecordWhereInput {
  return {
    deletedAt: null,
    ...(role !== "ADMIN" && { userId }),
  };
}

export async function getSummary(userId: string, role: Role) {
  const scope = buildUserScope(userId, role);

  const [income, expense] = await Promise.all([
    prisma.record.aggregate({
      where: { ...scope, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.record.aggregate({
      where: { ...scope, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = income._sum.amount ?? new Prisma.Decimal(0);
  const totalExpense = expense._sum.amount ?? new Prisma.Decimal(0);
  const netBalance = totalIncome.minus(totalExpense);

  return {
    totalIncome,
    totalExpense,
    netBalance,
  };
}

export async function getByCategory(userId: string, role: Role) {
  const scope = buildUserScope(userId, role);

  const totals = await prisma.record.groupBy({
    by: ["category", "type"],
    where: scope,
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  return totals.map((entry) => ({
    category: entry.category,
    type: entry.type,
    total: entry._sum.amount ?? new Prisma.Decimal(0),
  }));
}

export async function getTrends(userId: string, role: Role) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const isAdmin = role === "ADMIN";

  // Aggregate in SQL — returns ~24 rows max instead of N records
  const rows = await prisma.$queryRaw<TrendRow[]>`
    SELECT
      TO_CHAR(date, 'YYYY-MM') AS month,
      type::TEXT AS type,
      COALESCE(SUM(amount), 0) AS total
    FROM "Record"
    WHERE "deletedAt" IS NULL
      AND date >= ${twelveMonthsAgo}
      ${isAdmin ? Prisma.sql`` : Prisma.sql`AND "userId" = ${userId}`}
    GROUP BY month, type
    ORDER BY month ASC, type ASC
  `;

  // Merge INCOME/EXPENSE rows into a single object per month
  const monthlyMap = new Map<string, { income: Prisma.Decimal; expense: Prisma.Decimal }>();

  for (const row of rows) {
    if (!monthlyMap.has(row.month)) {
      monthlyMap.set(row.month, {
        income: new Prisma.Decimal(0),
        expense: new Prisma.Decimal(0),
      });
    }

    const entry = monthlyMap.get(row.month)!;
    const amount = new Prisma.Decimal(row.total.toString());

    if (row.type === "INCOME") {
      entry.income = amount;
    } else {
      entry.expense = amount;
    }
  }

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    income: data.income,
    expense: data.expense,
    net: data.income.minus(data.expense),
  }));
}

export async function getRecent(userId: string, role: Role) {
  const scope = buildUserScope(userId, role);

  const records = await prisma.record.findMany({
    where: scope,
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      notes: true,
      userId: true,
      createdAt: true,
    },
    orderBy: { date: "desc" },
    take: 10,
  });

  return records;
}
