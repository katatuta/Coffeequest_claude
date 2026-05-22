import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { addBudgetAdjustment } from './budgetService';

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
  await addBudgetAdjustment(userId, amount, 'marketplace_sale', docRef.id, year, month);
  return docRef.id;
}

export async function getActiveListings() {
  const q = query(collection(db, LISTINGS), where('status', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getMyListings(userId) {
  const q = query(collection(db, LISTINGS), where('sellerId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getMyTransactions(userId) {
  const q = query(collection(db, TRANSACTIONS), where('buyerId', '==', userId));
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
  const q = query(collection(db, TRANSACTIONS), where('sellerId', '==', userId));
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
    createdAt: serverTimestamp(),
    completedAt: null,
  });
}

// A가 승인 → B 사용액 감소, listing 잔량 차감
export async function confirmTransaction(transactionId, listingId, requestedAmount, sellerId, buyerId) {
  const { year, month } = nowYearMonth();

  await updateDoc(doc(db, TRANSACTIONS, transactionId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });

  // B 사용액 감소 (음수 조정)
  await addBudgetAdjustment(buyerId, -requestedAmount, 'marketplace_purchase', transactionId, year, month);

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

// A가 등록 취소 → 미판매 잔량만큼 A 사용액 원복
export async function cancelListing(listingId, sellerId, remainingAmount) {
  const { year, month } = nowYearMonth();

  await updateDoc(doc(db, LISTINGS, listingId), { status: 'cancelled' });

  // pending 거래도 모두 취소
  const txSnap = await getDocs(
    query(collection(db, TRANSACTIONS), where('listingId', '==', listingId), where('status', '==', 'pending'))
  );
  await Promise.all(txSnap.docs.map(d => updateDoc(doc(db, TRANSACTIONS, d.id), { status: 'cancelled' })));

  // 미판매분만큼 원복 (음수 조정)
  if (remainingAmount > 0) {
    await addBudgetAdjustment(sellerId, -remainingAmount, 'marketplace_cancel', listingId, year, month);
  }
}
