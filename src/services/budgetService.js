import { getAllPurchases } from './purchaseService';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const MONTHLY_BUDGET = 50000;
const ADJUSTMENTS = 'budget_adjustments';

export async function addBudgetAdjustment(userId, amount, reason, relatedId, year, month) {
  await addDoc(collection(db, ADJUSTMENTS), {
    userId,
    amount,
    reason,
    relatedId,
    year,
    month,
    createdAt: serverTimestamp(),
  });
}

async function getAdjustmentsTotal(userId, year, month) {
  const q = query(
    collection(db, ADJUSTMENTS),
    where('userId', '==', userId),
    where('year', '==', year),
    where('month', '==', month)
  );
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
}

export async function getCurrentBudgetStatus(userId) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const allPurchases = await getAllPurchases(userId);
    const purchases = allPurchases.filter(p => {
      if (!p.purchasedAt) return false;
      return p.purchasedAt.getFullYear() === year &&
             p.purchasedAt.getMonth() + 1 === month;
    });

    const purchaseSpent = purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const adjustments = await getAdjustmentsTotal(userId, year, month);
    const spent = purchaseSpent + adjustments;
    const remaining = MONTHLY_BUDGET - spent;
    const percentUsed = (spent / MONTHLY_BUDGET) * 100;

    return {
      totalBudget: MONTHLY_BUDGET,
      spent,
      remaining,
      percentUsed: Math.min(percentUsed, 100),
      year,
      month,
    };
  } catch (error) {
    console.error('Error getting budget status:', error);
    throw error;
  }
}

export async function getBudgetStatusByMonth(userId, year, month) {
  try {
    const allPurchases = await getAllPurchases(userId);
    const purchases = allPurchases.filter(p => {
      if (!p.purchasedAt) return false;
      return p.purchasedAt.getFullYear() === year &&
             p.purchasedAt.getMonth() + 1 === month;
    });

    const purchaseSpent = purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const adjustments = await getAdjustmentsTotal(userId, year, month);
    const spent = purchaseSpent + adjustments;
    const remaining = MONTHLY_BUDGET - spent;
    const percentUsed = (spent / MONTHLY_BUDGET) * 100;

    return {
      totalBudget: MONTHLY_BUDGET,
      spent,
      remaining,
      percentUsed: Math.min(percentUsed, 100),
      year,
      month,
    };
  } catch (error) {
    console.error('Error getting budget status by month:', error);
    throw error;
  }
}
