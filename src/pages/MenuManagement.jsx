import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMenus, addMenu, deleteMenu } from '../services/menuService';
import { Coffee, Plus, Trash2, Upload, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MenuManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '커피'
  });

  const categories = ['커피', '주스', '에이드', '기타'];

  useEffect(() => {
    loadMenus();
  }, [user]);

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
      await addMenu(user.uid, {
        name: formData.name,
        price: Number(formData.price),
        category: formData.category
      });
      setFormData({ name: '', price: '', category: '커피' });
      setShowAddForm(false);
      loadMenus();
    } catch (error) {
      console.error('Error adding menu:', error);
      alert('메뉴 추가에 실패했습니다.');
    }
  }

  async function handleDelete(menuId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteMenu(menuId);
      loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      alert('메뉴 삭제에 실패했습니다.');
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
      { '메뉴명': '딸기주스', '가격': 5000, '카테고리': '주스' }
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
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
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
            onClick={downloadTemplate}
            className="btn-secondary"
          >
            템플릿
          </button>
        </div>

        {/* 메뉴 추가 폼 */}
        {showAddForm && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">새 메뉴 추가</h3>
            <form onSubmit={handleAddMenu} className="space-y-4">
              <div>
                <label className="label">메뉴명</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="아메리카노"
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

              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">추가</button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary flex-1"
                >
                  취소
                </button>
              </div>
            </form>
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
                        onClick={() => handleDelete(menu.id)}
                        className="text-red-500 hover:text-red-700"
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