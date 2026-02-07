import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAllPurchases } from '../services/purchaseService';
import { ArrowLeft, TrendingUp, PieChart, Award } from 'lucide-react';

export default function Statistics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPurchases();
  }, [user]);

  async function loadPurchases() {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getAllPurchases(user.uid);
      setPurchases(data);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  }

  // 카테고리별 통계
  const categoryStats = purchases.reduce((acc, p) => {
    // 임시로 카테고리 추출 (실제로는 메뉴 정보에서 가져와야 함)
    const category = '음료';
    if (!acc[category]) {
      acc[category] = { count: 0, total: 0 };
    }
    acc[category].count += p.quantity;
    acc[category].total += p.totalPrice;
    return acc;
  }, {});

  // 인기 메뉴 Top 5
  const menuStats = purchases.reduce((acc, p) => {
    if (!acc[p.menuName]) {
      acc[p.menuName] = { count: 0, total: 0 };
    }
    acc[p.menuName].count += p.quantity;
    acc[p.menuName].total += p.totalPrice;
    return acc;
  }, {});

  const topMenus = Object.entries(menuStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const totalSpent = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
  const totalItems = purchases.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">구매 통계</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="card text-center py-12">
            <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">아직 구매 내역이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 전체 요약 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card text-center">
                <p className="text-sm text-gray-600 mb-2">총 지출</p>
                <p className="text-2xl font-bold text-primary-600">
                  {totalSpent.toLocaleString()}원
                </p>
              </div>

              <div className="card text-center">
                <p className="text-sm text-gray-600 mb-2">총 구매</p>
                <p className="text-2xl font-bold text-primary-600">
                  {totalItems}개
                </p>
              </div>
            </div>

            {/* 인기 메뉴 Top 5 */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-gray-900">인기 메뉴 Top 5</h2>
              </div>

              {topMenus.length === 0 ? (
                <p className="text-center text-gray-500 py-4">데이터가 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {topMenus.map(([menuName, stats], index) => (
                    <div key={menuName} className="flex items-center gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{menuName}</p>
                        <p className="text-sm text-gray-500">{stats.count}회 구매</p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {stats.total.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 월별 평균 */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-gray-900">구매 패턴</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">평균 구매액</p>
                  <p className="text-xl font-bold text-gray-900">
                    {purchases.length > 0 
                      ? Math.round(totalSpent / purchases.length).toLocaleString()
                      : 0}원
                  </p>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">총 구매 횟수</p>
                  <p className="text-xl font-bold text-gray-900">
                    {purchases.length}회
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}