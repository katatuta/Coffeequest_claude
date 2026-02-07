import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMenus } from '../services/menuService';
import { addPurchase } from '../services/purchaseService';
import { ArrowLeft, Search, Plus, Minus, ShoppingCart } from 'lucide-react';

export default function AddPurchase() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [filteredMenus, setFilteredMenus] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = ['전체', '커피', '음료', '기타'];

  useEffect(() => {
    loadMenus();
  }, [user]);

  useEffect(() => {
    filterMenus();
  }, [selectedCategory, searchQuery, menus]);

  async function loadMenus() {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getMenus(user.uid);
      setMenus(data);
      setFilteredMenus(data);
    } catch (error) {
      console.error('Error loading menus:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterMenus() {
    let filtered = menus;

    if (selectedCategory !== '전체') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMenus(filtered);
  }

  function addToCart(menu) {
    const existingItem = cart.find(item => item.id === menu.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === menu.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...menu, quantity: 1 }]);
    }
  }

  function updateQuantity(menuId, delta) {
    setCart(cart.map(item =>
      item.id === menuId
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  }

  function getTotalPrice() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      alert('구매할 메뉴를 선택해주세요.');
      return;
    }

    try {
      for (const item of cart) {
        await addPurchase(user.uid, {
          menuId: item.id,
          menuName: item.name,
          price: item.price,
          quantity: item.quantity
        });
      }

      alert('구매가 기록되었습니다!');
      navigate('/');
    } catch (error) {
      console.error('Error recording purchase:', error);
      alert('구매 기록에 실패했습니다.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">구매 기록</h1>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
              placeholder="메뉴 검색..."
            />
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">메뉴가 없습니다.</p>
            <button
              onClick={() => navigate('/menus')}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              메뉴 추가하기
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredMenus.map(menu => {
              const cartItem = cart.find(item => item.id === menu.id);
              const quantity = cartItem?.quantity || 0;

              return (
                <div key={menu.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{menu.name}</p>
                      <p className="text-sm text-gray-500">{menu.category}</p>
                      <p className="text-lg font-bold text-primary-600 mt-1">
                        {menu.price.toLocaleString()}원
                      </p>
                    </div>

                    {quantity === 0 ? (
                      <button
                        onClick={() => addToCart(menu)}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        담기
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(menu.id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-semibold text-lg w-8 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(menu.id, 1)}
                          className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 장바구니 플로팅 버튼 */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">총 {cart.length}개 메뉴</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getTotalPrice().toLocaleString()}원
                </p>
              </div>
              <button
                onClick={handleCheckout}
                className="btn-primary px-8"
              >
                구매 완료
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {cart.map(item => (
                <div key={item.id} className="flex-shrink-0 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                  {item.name} x{item.quantity}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}