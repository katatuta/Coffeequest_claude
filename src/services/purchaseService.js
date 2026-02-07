import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const PURCHASES_COLLECTION = 'purchases';

// 구매 기록 추가
export async function addPurchase(userId, purchaseData) {
  try {
    const docRef = await addDoc(collection(db, PURCHASES_COLLECTION), {
      userId,
      menuId: purchaseData.menuId,
      menuName: purchaseData.menuName,
      price: purchaseData.price,
      quantity: purchaseData.quantity,
      totalPrice: purchaseData.price * purchaseData.quantity,
      memo: purchaseData.memo || '',
      purchasedAt: serverTimestamp()
    });
    return { id: docRef.id, ...purchaseData };
  } catch (error) {
    console.error('Error adding purchase:', error);
    throw error;
  }
}

// 월별 구매 내역 조회
export async function getPurchasesByMonth(userId, year, month) {
  try {
    // 해당 월의 시작과 끝
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const q = query(
      collection(db, PURCHASES_COLLECTION),
      where('userId', '==', userId),
      where('purchasedAt', '>=', Timestamp.fromDate(startDate)),
      where('purchasedAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('purchasedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      purchasedAt: doc.data().purchasedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting purchases:', error);
    throw error;
  }
}

// 전체 구매 내역 조회 (인덱스 불필요)
export async function getAllPurchases(userId) {
  try {
    const q = query(
      collection(db, PURCHASES_COLLECTION),
      where('userId', '==', userId)
      // orderBy 제거 - 클라이언트에서 정렬
    );

    const querySnapshot = await getDocs(q);
    const purchases = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      purchasedAt: doc.data().purchasedAt?.toDate()
    }));
    
    // 클라이언트에서 정렬 (최신순)
    return purchases.sort((a, b) => {
      if (!a.purchasedAt) return 1;
      if (!b.purchasedAt) return -1;
      return b.purchasedAt - a.purchasedAt;
    });
  } catch (error) {
    console.error('Error getting all purchases:', error);
    throw error;
  }
}

// 구매 내역 수정
export async function updatePurchase(purchaseId, updates) {
  try {
    const purchaseRef = doc(db, PURCHASES_COLLECTION, purchaseId);
    await updateDoc(purchaseRef, updates);
  } catch (error) {
    console.error('Error updating purchase:', error);
    throw error;
  }
}

// 구매 내역 삭제
export async function deletePurchase(purchaseId) {
  try {
    await deleteDoc(doc(db, PURCHASES_COLLECTION, purchaseId));
  } catch (error) {
    console.error('Error deleting purchase:', error);
    throw error;
  }
}