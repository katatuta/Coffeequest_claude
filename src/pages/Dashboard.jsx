import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getCurrentBudgetStatus } from '../services/budgetService';
import { getPurchasesByMonth } from '../services/purchaseService';
import { Coffee, Plus, TrendingUp, AlertCircle, Lightbulb, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    try {
      setLoading(true);
      const status = await getCurrentBudgetStatus(user.uid);
      setBudgetStatus(status);

      // 전체 구매 내역 조회 후 최근 5개만 표시
      const { getAllPurchases } = await import('../services/purchaseService');
      const allPurchases = await getAllPurchases(user.uid);
      setRecentPurchases(allPurchases.slice(0, 5));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const showRecommendation = budgetStatus && budgetStatus.remaining <= 20000 && budgetStatus.remaining > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-6 h-6 text-primary-500" />
            <h1 className="text-xl font-bold text-gray-900">커피퀘스트 트래커</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 예산 현황 카드 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {budgetStatus?.month}월 예산 현황
            </h2>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">총 예산</span>
              <span className="text-lg font-semibold text-gray-900">
                {budgetStatus?.totalBudget.toLocaleString()}원
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">사용액</span>
              <span className="text-lg font-semibold text-primary-600">
                {budgetStatus?.spent.toLocaleString()}원
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">잔액</span>
              <span className={`text-2xl font-bold ${
                budgetStatus?.remaining < 10000 ? 'text-red-600' : 'text-green-600'
              }`}>
                {budgetStatus?.remaining.toLocaleString()}원
              </span>
            </div>

            {/* 프로그레스 바 */}
            <div className="pt-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    budgetStatus?.percentUsed >= 100
                      ? 'bg-red-500'
                      : budgetStatus?.percentUsed >= 80
                      ? 'bg-yellow-500'
                      : 'bg-primary-500'
                  }`}
                  style={{ width: `${Math.min(budgetStatus?.percentUsed || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                {budgetStatus?.percentUsed.toFixed(1)}% 사용
              </p>
            </div>
          </div>
        </div>

        {/* 잔액 소진 추천 배너 */}
        {showRecommendation && (
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4 border border-primary-200">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  잔액 소진 추천
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  남은 예산으로 정확히 0원을 만들 수 있는 메뉴 조합을 확인해보세요!
                </p>
                <button
                  onClick={() => navigate('/recommendation')}
                  className="btn-primary text-sm"
                >
                  추천 보기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 빠른 액션 버튼 */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/purchase')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <Plus className="w-8 h-8 text-primary-500 mb-2" />
            <span className="font-semibold text-gray-900">구매 기록</span>
          </button>

          <button
            onClick={() => navigate('/menus')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <Coffee className="w-8 h-8 text-primary-500 mb-2" />
            <span className="font-semibold text-gray-900">메뉴 관리</span>
          </button>
        </div>

        {/* 최근 구매 내역 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">최근 구매</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              전체 보기
            </button>
          </div>

          {recentPurchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>구매 내역이 없습니다.</p>
              <p className="text-sm mt-1">첫 구매를 기록해보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{purchase.menuName}</p>
                    <p className="text-sm text-gray-500">
                      {purchase.purchasedAt && format(purchase.purchasedAt, 'MM월 dd일 HH:mm', { locale: ko })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {purchase.totalPrice.toLocaleString()}원
                    </p>
                    <p className="text-sm text-gray-500">
                      {purchase.quantity}개
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-around">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center gap-1 text-primary-600"
          >
            <Coffee className="w-6 h-6" />
            <span className="text-xs font-medium">홈</span>
          </button>
          <button
            onClick={() => navigate('/purchase')}
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-medium">구매</span>
          </button>
          <button
            onClick={() => navigate('/statistics')}
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs font-medium">통계</span>
          </button>
        </div>
      </nav>
    </div>
  );
}