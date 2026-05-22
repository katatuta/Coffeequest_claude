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

const LISTINGS = 'marketplace_listings';
const TRANSACTIONS = 'marketplace_transactions';

export async function createListing(userId, userName, amount) {
  const docRef = await addDoc(collection(db, LISTINGS), {
    sellerId: userId,
    sellerName: userName,
    totalAmount: amount,
    remainingAmount: amount,
    status: 'active',
    createdAt: serverTimestamp(),
  });
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
    .map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate(), completedAt: d.data().completedAt?.toDate() }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getTransactionsForSeller(userId) {
  const q = query(collection(db, TRANSACTIONS), where('sellerId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate(), completedAt: d.data().completedAt?.toDate() }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function requestPurchase(listingId, listing, buyerId, buyerName, requestedAmount) {
  await addDoc(collection(db, TRANSACTIONS), {
    listingId,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    buyerId,
    buyerName,
    requestedAmount,
    discountedPrice: Math.floor(requestedAmount * 0.9),
    status: 'pending',
    createdAt: serverTimestamp(),
    completedAt: null,
  });
}

export async function confirmTransaction(transactionId, listingId, requestedAmount, sellerId) {
  await updateDoc(doc(db, TRANSACTIONS, transactionId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });

  const listingsSnap = await getDocs(
    query(collection(db, LISTINGS), where('sellerId', '==', sellerId))
  );
  const listingDoc = listingsSnap.docs.find(d => d.id === listingId);
  if (!listingDoc) return;

  const newRemaining = listingDoc.data().remainingAmount - requestedAmount;
  await updateDoc(doc(db, LISTINGS, listingId), {
    remainingAmount: Math.max(newRemaining, 0),
    status: newRemaining <= 0 ? 'completed' : 'active',
  });
}

export async function cancelListing(listingId) {
  await updateDoc(doc(db, LISTINGS, listingId), { status: 'cancelled' });
}
