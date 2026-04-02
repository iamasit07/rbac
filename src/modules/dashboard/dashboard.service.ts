import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export async function getSummary() {
  const [income, expense] = await Promise.all([
    prisma.record.aggregate({
      where: { type: "INCOME", deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.record.aggregate({
      where: { type: "EXPENSE", deletedAt: null },
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

export async function getByCategory() {
  const totals = await prisma.record.groupBy({
    by: ["category", "type"],
    where: { deletedAt: null },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  return totals.map((entry) => ({
    category: entry.category,
    type: entry.type,
    total: entry._sum.amount ?? new Prisma.Decimal(0),
  }));
}

export async function getTrends() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const records = await prisma.record.findMany({
    where: {
      deletedAt: null,
      date: { gte: twelveMonthsAgo },
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
    orderBy: { date: "asc" },
  });

  const monthlyMap = new Map<string, { income: Prisma.Decimal; expense: Prisma.Decimal }>();

  for (const record of records) {
    const key = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        income: new Prisma.Decimal(0),
        expense: new Prisma.Decimal(0),
      });
    }

    const entry = monthlyMap.get(key)!;

    if (record.type === "INCOME") {
      entry.income = entry.income.plus(record.amount);
    } else {
      entry.expense = entry.expense.plus(record.amount);
    }
  }

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    income: data.income,
    expense: data.expense,
    net: data.income.minus(data.expense),
  }));
}

export async function getRecent() {
  const records = await prisma.record.findMany({
    where: { deletedAt: null },
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
