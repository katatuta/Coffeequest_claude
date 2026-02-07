import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const MENUS_COLLECTION = 'menus';

// 메뉴 추가
export async function addMenu(userId, menuData) {
  try {
    const docRef = await addDoc(collection(db, MENUS_COLLECTION), {
      ...menuData,
      userId,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...menuData };
  } catch (error) {
    console.error('Error adding menu:', error);
    throw error;
  }
}

// 사용자의 모든 메뉴 조회
export async function getMenus(userId) {
  try {
    const q = query(
      collection(db, MENUS_COLLECTION), 
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting menus:', error);
    throw error;
  }
}

// 메뉴 수정
export async function updateMenu(menuId, updates) {
  try {
    const menuRef = doc(db, MENUS_COLLECTION, menuId);
    await updateDoc(menuRef, updates);
  } catch (error) {
    console.error('Error updating menu:', error);
    throw error;
  }
}

// 메뉴 삭제
export async function deleteMenu(menuId) {
  try {
    await deleteDoc(doc(db, MENUS_COLLECTION, menuId));
  } catch (error) {
    console.error('Error deleting menu:', error);
    throw error;
  }
}

// 엑셀 데이터로 메뉴 일괄 추가
export async function addMenusFromExcel(userId, menuArray) {
  try {
    const promises = menuArray.map(menu => 
      addMenu(userId, {
        name: menu.name,
        price: Number(menu.price),
        category: menu.category || '기타'
      })
    );
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error adding menus from excel:', error);
    throw error;
  }
}