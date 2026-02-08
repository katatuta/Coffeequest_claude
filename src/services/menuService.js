import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { ADMIN_EMAILS } from '../config/admin';

const MENUS_COLLECTION = 'menus';

// 관리자 UID를 가져오는 헬퍼 함수 (관리자 이메일 사용)
// 실제로는 모든 메뉴를 공유하므로 userId 필터를 사용하지 않음
async function getSharedMenus() {
  try {
    // 모든 메뉴 가져오기 (공용 메뉴)
    const q = query(
      collection(db, MENUS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting shared menus:', error);
    throw error;
  }
}

// 메뉴 목록 조회 (모든 사용자가 같은 메뉴를 봄)
export async function getMenus(userId) {
  try {
    // 공용 메뉴 반환
    return await getSharedMenus();
  } catch (error) {
    console.error('Error getting menus:', error);
    throw error;
  }
}

// 메뉴 추가 (관리자만 가능 - UI에서 체크)
export async function addMenu(userId, menuData) {
  try {
    const docRef = await addDoc(collection(db, MENUS_COLLECTION), {
      ...menuData,
      userId, // 추가한 사람 기록용
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding menu:', error);
    throw error;
  }
}

// 메뉴 수정
export async function updateMenu(menuId, menuData) {
  try {
    const menuRef = doc(db, MENUS_COLLECTION, menuId);
    await updateDoc(menuRef, {
      ...menuData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating menu:', error);
    throw error;
  }
}

// 메뉴 삭제 (관리자만 가능 - UI에서 체크)
export async function deleteMenu(menuId) {
  try {
    await deleteDoc(doc(db, MENUS_COLLECTION, menuId));
  } catch (error) {
    console.error('Error deleting menu:', error);
    throw error;
  }
}
