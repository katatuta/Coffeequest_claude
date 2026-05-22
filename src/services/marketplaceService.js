import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const LISTINGS = 'marketplace_listings';
const TRANSACTIONS = 'marketplace_transactions';

function nowYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// A가 잔액 등록 → A 사용액 즉시 증가
export async function createListing(userId, userName, amount, accountNumber) {
  const { year, month } = nowYearMonth();
  const docRef = await addDoc(collection(db, LISTINGS), {
    sellerId: userId,
    sellerName: userName,
    accountNumber,
    totalAmount: amount,
    remainingAmount: amount,
    status: 'active',
    year,
    month,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getActiveListings() {
  const { year, month } = nowYearMonth();
  const q = query(
    collection(db, LISTINGS),
    where('status', '==', 'active'),
    where('year', '==', year),
    where('month', '==', month),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getMyListings(userId) {
  const { year, month } = nowYearMonth();
  const q = query(
    collection(db, LISTINGS),
    where('sellerId', '==', userId),
    where('year', '==', year),
    where('month', '==', month),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getMyTransactions(userId) {
  const { year, month } = nowYearMonth();
  const q = query(
    collection(db, TRANSACTIONS),
    where('buyerId', '==', userId),
    where('year', '==', year),
    where('month', '==', month),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({
      id: d.id, ...d.data(),
      createdAt: d.data().createdAt?.toDate(),
      completedAt: d.data().completedAt?.toDate(),
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getTransactionsForSeller(userId) {
  const { year, month } = nowYearMonth();
  const q = query(
    collection(db, TRANSACTIONS),
    where('sellerId', '==', userId),
    where('year', '==', year),
    where('month', '==', month),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({
      id: d.id, ...d.data(),
      createdAt: d.data().createdAt?.toDate(),
      completedAt: d.data().completedAt?.toDate(),
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// B가 구매 의사 표시 → 계좌번호 포함한 transaction 생성
export async function requestPurchase(listingId, listing, buyerId, buyerName, requestedAmount) {
  const { year, month } = nowYearMonth();
  await addDoc(collection(db, TRANSACTIONS), {
    listingId,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    accountNumber: listing.accountNumber,
    buyerId,
    buyerName,
    requestedAmount,
    discountedPrice: Math.floor(requestedAmount * 0.9),
    status: 'pending',
    year,
    month,
    createdAt: serverTimestamp(),
    completedAt: null,
  });
}

// A가 승인 → listing 잔량 차감 (예산은 budgetService에서 동적 계산)
export async function confirmTransaction(transactionId, listingId, requestedAmount, sellerId, buyerId) {
  await updateDoc(doc(db, TRANSACTIONS, transactionId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });

  // listing 잔량 차감
  const snap = await getDocs(query(collection(db, LISTINGS), where('sellerId', '==', sellerId)));
  const listingDoc = snap.docs.find(d => d.id === listingId);
  if (!listingDoc) return;

  const newRemaining = listingDoc.data().remainingAmount - requestedAmount;
  await updateDoc(doc(db, LISTINGS, listingId), {
    remainingAmount: Math.max(newRemaining, 0),
    status: newRemaining <= 0 ? 'completed' : 'active',
  });
}

export async function clearAllMarketplaceData() {
  const deleteAll = async (col) => {
    const snap = await getDocs(collection(db, col));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
  };

  // reason 단일 필드 조건으로 월 관계없이 모든 마켓플레이스 조정액 삭제
  const adjReasons = ['marketplace_sale', 'marketplace_purchase', 'marketplace_cancel'];
  for (const reason of adjReasons) {
    const adjSnap = await getDocs(
      query(collection(db, 'budget_adjustments'), where('reason', '==', reason))
    );
    await Promise.all(adjSnap.docs.map(d => deleteDoc(doc(db, 'budget_adjustments', d.id))));
  }

  await deleteAll(LISTINGS);
  await deleteAll(TRANSACTIONS);
}

// A가 등록 취소 (예산은 budgetService에서 동적 계산)
export async function cancelListing(listingId, sellerId) {
  await updateDoc(doc(db, LISTINGS, listingId), { status: 'cancelled' });

  // pending 거래도 모두 취소
  const txSnap = await getDocs(
    query(collection(db, TRANSACTIONS), where('listingId', '==', listingId), where('status', '==', 'pending'))
  );
  await Promise.all(txSnap.docs.map(d => updateDoc(doc(db, TRANSACTIONS, d.id), { status: 'cancelled' })));
}
