import { getAllPurchases } from './purchaseService';

const MONTHLY_BUDGET = 50000; // 월 예산 5만원

// 현재 월의 예산 상태 계산
export async function getCurrentBudgetStatus(userId) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 전체 구매 내역 조회 후 현재 월만 필터링
    const allPurchases = await getAllPurchases(userId);
    const purchases = allPurchases.filter(p => {
      if (!p.purchasedAt) return false;
      return p.purchasedAt.getFullYear() === year && 
             p.purchasedAt.getMonth() + 1 === month;
    });
    
    const spent = purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const remaining = MONTHLY_BUDGET - spent;
    const percentUsed = (spent / MONTHLY_BUDGET) * 100;

    return {
      totalBudget: MONTHLY_BUDGET,
      spent,
      remaining,
      percentUsed: Math.min(percentUsed, 100),
      year,
      month
    };
  } catch (error) {
    console.error('Error getting budget status:', error);
    throw error;
  }
}

// 특정 월의 예산 상태 계산
export async function getBudgetStatusByMonth(userId, year, month) {
  try {
    // 전체 구매 내역 조회 후 해당 월만 필터링
    const allPurchases = await getAllPurchases(userId);
    const purchases = allPurchases.filter(p => {
      if (!p.purchasedAt) return false;
      return p.purchasedAt.getFullYear() === year && 
             p.purchasedAt.getMonth() + 1 === month;
    });
    
    const spent = purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const remaining = MONTHLY_BUDGET - spent;
    const percentUsed = (spent / MONTHLY_BUDGET) * 100;

    return {
      totalBudget: MONTHLY_BUDGET,
      spent,
      remaining,
      percentUsed: Math.min(percentUsed, 100),
      year,
      month
    };
  } catch (error) {
    console.error('Error getting budget status by month:', error);
    throw error;
  }
}