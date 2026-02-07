import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPurchasesByMonth, deletePurchase } from '../services/purchaseService';
import { ArrowLeft, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function PurchaseHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  useEffect(() => {
    loadPurchases();
  }, [user, selectedMonth]);

  async function loadPurchases() {
    if (!user) return;

    try {
      setLoading(true);
      // 임시로 전체 구매 내역 조회 후 클라이언트에서 필터링
      const { getAllPurchases } = await import('../services/purchaseService');
      const allData = await getAllPurchases(user.uid);
      
      // 선택한 월로 필터링
      const filtered = allData.filter(p => {
        if (!p.purchasedAt) return false;
        const date = p.purchasedAt;
        return date.getFullYear() === selectedMonth.year && 
               date.getMonth() + 1 === selectedMonth.month;
      });
      
      setPurchases(filtered);
    } catch (error) {
      console.error('Error loading purchases:', error);
      // 에러 발생 시 월별 조회로 폴백
      try {
        const data = await getPurchasesByMonth(user.uid, selectedMonth.year, selectedMonth.month);
        setPurchases(data);
      } catch (err) {
        console.error('Fallback also failed:', err);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(purchaseId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deletePurchase(purchaseId);
      loadPurchases();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert('삭제에 실패했습니다.');
    }
  }

  function changeMonth(delta) {
    setSelectedMonth(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;

      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }

      return { year: newYear, month: newMonth };
    });
  }

  const totalSpent = purchases.reduce((sum, p) => sum + p.totalPrice, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">구매 내역</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 월 선택 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              className="btn-secondary"
            >
              ←
            </button>

            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-1">
                <Calendar className="w-5 h-5 text-primary-500" />
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedMonth.year}년 {selectedMonth.month}월
                </h2>
              </div>
              <p className="text-2xl font-bold text-primary-600">
                {totalSpent.toLocaleString()}원
              </p>
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="btn-secondary"
            >
              →
            </button>
          </div>
        </div>

        {/* 구매 목록 */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">구매 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{purchase.menuName}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {purchase.purchasedAt && format(purchase.purchasedAt, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-600">
                        단가: {purchase.price.toLocaleString()}원
                      </span>
                      <span className="text-sm text-gray-600">
                        수량: {purchase.quantity}개
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-start gap-3">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {purchase.totalPrice.toLocaleString()}원
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(purchase.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}