import { getAllPurchases } from './purchaseService';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const MONTHLY_BUDGET = 50000;
const ADJUSTMENTS = 'budget_adjustments';

// 마켓플레이스 reason은 동적 계산으로 대체되므로 제외
const MARKETPLACE_REASONS = ['marketplace_sale', 'marketplace_purchase', 'marketplace_cancel'];

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
  return snap.docs
    .filter(d => !MARKETPLACE_REASONS.includes(d.data().reason))
    .reduce((sum, d) => sum + (d.data().amount || 0), 0);
}

// 마켓플레이스 예산 영향을 listings/transactions에서 직접 계산
async function getMarketplaceImpact(userId, year, month) {
  // 판매자: 이번 달 등록한 listing의 실제 소진 금액
  const listingSnap = await getDocs(
    query(collection(db, 'marketplace_listings'), where('sellerId', '==', userId))
  );
  const saleImpact = listingSnap.docs
    .filter(d => d.data().year === year && d.data().month === month)
    .reduce((sum, d) => {
      const data = d.data();
      // 취소된 경우 실제 판매분(totalAmount - remainingAmount)만 반영
      if (data.status === 'cancelled') return sum + (data.totalAmount - data.remainingAmount);
      return sum + data.totalAmount;
    }, 0);

  // 구매자: 이번 달 승인된 거래의 금액만큼 사용액 감소
  const txSnap = await getDocs(
    query(collection(db, 'marketplace_transactions'), where('buyerId', '==', userId))
  );
  const purchaseCredit = txSnap.docs
    .filter(d => d.data().year === year && d.data().month === month && d.data().status === 'completed')
    .reduce((sum, d) => sum + (d.data().requestedAmount || 0), 0);

  return saleImpact - purchaseCredit;
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
    const marketplaceImpact = await getMarketplaceImpact(userId, year, month);
    const spent = purchaseSpent + adjustments + marketplaceImpact;
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
    const marketplaceImpact = await getMarketplaceImpact(userId, year, month);
    const spent = purchaseSpent + adjustments + marketplaceImpact;
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
