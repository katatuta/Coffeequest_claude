import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMenus, addMenu, deleteMenu, updateMenu } from '../services/menuService';
import { Coffee, Plus, Trash2, Upload, ArrowLeft, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MenuManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSheetForm, setShowSheetForm] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [editingMenu, setEditingMenu] = useState(null); // 수정 중인 메뉴
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '커피'
  });

  const categories = ['커피', '음료', '기타'];

  useEffect(() => {
    // 관리자가 아니면 접근 차단
    if (!isAdmin) {
      alert('메뉴 관리는 관리자만 접근 가능합니다.');
      navigate('/');
      return;
    }
    loadMenus();
  }, [user, isAdmin, navigate]);

  async function loadMenus() {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getMenus(user.uid);
      setMenus(data);
    } catch (error) {
      console.error('Error loading menus:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMenu(e) {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert('메뉴명과 가격을 입력해주세요.');
      return;
    }

    try {
      if (editingMenu) {
        // 수정 모드
        await updateMenu(editingMenu.id, {
          name: formData.name,
          price: Number(formData.price),
          category: formData.category
        });
        setEditingMenu(null);
      } else {
        // 추가 모드
        await addMenu(user.uid, {
          name: formData.name,
          price: Number(formData.price),
          category: formData.category
        });
      }
      setFormData({ name: '', price: '', category: '커피' });
      setShowAddForm(false);
      loadMenus();
    } catch (error) {
      console.error('Error saving menu:', error);
      alert('메뉴 저장에 실패했습니다.');
    }
  }

  function handleEditMenu(menu) {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      price: menu.price.toString(),
      category: menu.category
    });
    setShowAddForm(true);
    setShowSheetForm(false);
  }

  function handleCancelEdit() {
    setEditingMenu(null);
    setFormData({ name: '', price: '', category: '커피' });
    setShowAddForm(false);
  }

  async function handleDelete(menuId) {
    try {
      await deleteMenu(menuId);
      loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      alert('메뉴 삭제에 실패했습니다.');
    }
  }

  async function handleSheetImport(e) {
    e.preventDefault();
    if (!sheetUrl) {
      alert('스프레드시트 링크를 입력해주세요.');
      return;
    }

    try {
      // 구글 스프레드시트 링크에서 ID 추출
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        alert('올바른 구글 스프레드시트 링크가 아닙니다.');
        return;
      }

      const spreadsheetId = match[1];
      
      // gid 추출 (시트 번호)
      const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      // CSV로 export하는 URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

      // CSV 데이터 가져오기
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('스프레드시트를 가져올 수 없습니다. 공유 설정을 확인해주세요.');
      }

      const csvText = await response.text();
      
      // CSV 파싱
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // 헤더 확인
      const nameIdx = headers.findIndex(h => h.includes('메뉴') || h.toLowerCase().includes('name'));
      const priceIdx = headers.findIndex(h => h.includes('가격') || h.toLowerCase().includes('price'));
      const categoryIdx = headers.findIndex(h => h.includes('카테고리') || h.toLowerCase().includes('category'));

      if (nameIdx === -1 || priceIdx === -1) {
        alert('스프레드시트에 "메뉴명"과 "가격" 열이 필요합니다.');
        return;
      }

      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        const name = values[nameIdx];
        const price = values[priceIdx];
        const category = categoryIdx !== -1 ? values[categoryIdx] : '기타';

        if (name && price) {
          await addMenu(user.uid, {
            name,
            price: Number(price),
            category: category || '기타'
          });
          count++;
        }
      }

      alert(`${count}개의 메뉴가 추가되었습니다.`);
      setSheetUrl('');
      setShowSheetForm(false);
      loadMenus();
    } catch (error) {
      console.error('Error importing from sheet:', error);
      alert('스프레드시트 가져오기에 실패했습니다. 링크가 "링크가 있는 모든 사용자"로 공유되어 있는지 확인해주세요.');
    }
  }

  async function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      for (const row of jsonData) {
        if (row['메뉴명'] && row['가격']) {
          await addMenu(user.uid, {
            name: row['메뉴명'],
            price: Number(row['가격']),
            category: row['카테고리'] || '기타'
          });
        }
      }

      alert(`${jsonData.length}개의 메뉴가 추가되었습니다.`);
      loadMenus();
    } catch (error) {
      console.error('Error uploading excel:', error);
      alert('엑셀 업로드에 실패했습니다.');
    }
  }

  function downloadTemplate() {
    const template = [
      { '메뉴명': '아메리카노', '가격': 4000, '카테고리': '커피' },
      { '메뉴명': '라떼', '가격': 4500, '카테고리': '커피' },
      { '메뉴명': '딸기주스', '가격': 5000, '카테고리': '음료' },
      { '메뉴명': '레모네이드', '가격': 5500, '카테고리': '음료' }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '메뉴');
    XLSX.writeFile(wb, '메뉴_템플릿.xlsx');
  }

  const groupedMenus = menus.reduce((acc, menu) => {
    if (!acc[menu.category]) {
      acc[menu.category] = [];
    }
    acc[menu.category].push(menu);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">메뉴 관리</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 액션 버튼 */}
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => {
              setEditingMenu(null);
              setFormData({ name: '', price: '', category: '커피' });
              setShowAddForm(!showAddForm);
              setShowSheetForm(false);
            }}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>

          <label className="btn-secondary flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            엑셀
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setShowSheetForm(!showSheetForm)}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            시트
          </button>

          <button
            onClick={downloadTemplate}
            className="btn-secondary"
          >
            템플릿
          </button>
        </div>

        {/* 메뉴 추가/수정 모달 */}
        {showAddForm && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCancelEdit}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                  {editingMenu ? '메뉴 수정' : '새 메뉴 추가'}
                </h3>
                <form onSubmit={handleAddMenu} className="space-y-4">
                  <div>
                    <label className="label">메뉴명</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                      placeholder="아메리카노"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="label">가격</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="input-field"
                      placeholder="4000"
                    />
                  </div>

                  <div>
                    <label className="label">카테고리</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-field"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="btn-primary flex-1">
                      {editingMenu ? '수정 완료' : '추가'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn-secondary flex-1"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 구글 스프레드시트 가져오기 모달 */}
        {showSheetForm && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowSheetForm(false);
              setSheetUrl('');
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">구글 스프레드시트에서 가져오기</h3>
                <p className="text-sm text-gray-600 mb-4">
                  스프레드시트를 "링크가 있는 모든 사용자"로 공유한 후 링크를 붙여넣으세요.
                </p>
                
                <form onSubmit={handleSheetImport} className="space-y-4">
                  <div>
                    <label className="label">스프레드시트 링크</label>
                    <input
                      type="text"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      className="input-field"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 스프레드시트 형식: 메뉴명 | 가격 | 카테고리
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900">
                    <p className="font-semibold mb-1">📝 공유 설정 방법:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>스프레드시트에서 "공유" 클릭</li>
                      <li>"링크가 있는 모든 사용자" 선택</li>
                      <li>"뷰어" 권한으로 설정</li>
                      <li>링크 복사 후 붙여넣기</li>
                    </ol>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="btn-primary flex-1">
                      가져오기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSheetForm(false);
                        setSheetUrl('');
                      }}
                      className="btn-secondary flex-1"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 목록 */}
        {loading ? (
          <div className="text-center py-8">
            <Coffee className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : menus.length === 0 ? (
          <div className="card text-center py-12">
            <Coffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">등록된 메뉴가 없습니다.</p>
            <p className="text-sm text-gray-500">메뉴를 추가하거나 엑셀로 업로드하세요.</p>
          </div>
        ) : (
          Object.entries(groupedMenus).map(([category, items]) => (
            <div key={category} className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-primary-500" />
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((menu) => (
                  <div key={menu.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{menu.name}</p>
                      <p className="text-sm text-gray-500">{menu.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {menu.price.toLocaleString()}원
                      </span>
                      <button
                        onClick={() => handleEditMenu(menu)}
                        className="text-blue-500 hover:text-blue-700"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(menu.id)}
                        className="text-red-500 hover:text-red-700"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}