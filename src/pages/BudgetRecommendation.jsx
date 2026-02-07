import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getCurrentBudgetStatus } from '../services/budgetService';
import { getMenus } from '../services/menuService';
import { findBudgetCombinations, findApproximateCombinations } from '../utils/budgetOptimizer';
import { ArrowLeft, Lightbulb, ShoppingBag } from 'lucide-react';

export default function BudgetRecommendation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [menus, setMenus] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
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

      const menuData = await getMenus(user.uid);
      setMenus(menuData);

      if (status.remaining > 0 && menuData.length > 0) {
        let combos = findBudgetCombinations(status.remaining, menuData, 5);
        
        if (combos.length === 0) {
          combos = findApproximateCombinations(status.remaining, menuData);
        }

        setRecommendations(combos);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Lightbulb className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">추천 조합 계산 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">잔액 소진 추천</h1>
              <p className="text-sm text-gray-600 mt-1">
                남은 예산으로 0원 만들기
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 현재 잔액 */}
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">현재 잔액</p>
            <p className="text-4xl font-bold text-primary-600">
              {budgetStatus?.remaining.toLocaleString()}원
            </p>
          </div>
        </div>

        {/* 추천 조합 */}
        {recommendations.length === 0 ? (
          <div className="card text-center py-12">
            <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">추천 조합을 찾을 수 없습니다.</p>
            <p className="text-sm text-gray-500">
              잔액이 너무 적거나 메뉴가 부족합니다.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary-500" />
              <h2 className="font-semibold text-gray-900">
                추천 조합 {recommendations.length}개
              </h2>
            </div>

            <div className="space-y-4">
              {recommendations.map((combo, index) => (
                <div key={index} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        옵션 {index + 1}
                      </h3>
                      <p className="text-sm text-gray-600">{combo.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">
                        {combo.totalPrice.toLocaleString()}원
                      </p>
                      {combo.totalPrice === budgetStatus?.remaining && (
                        <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          정확히 맞음!
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {combo.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-t">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {(item.price * item.count).toLocaleString()}원
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.price.toLocaleString()}원 x {item.count}개
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      // TODO: 이 조합으로 구매 화면으로 이동
                      alert('구매 기능은 준비 중입니다.');
                    }}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    이 조합으로 구매하기
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 도움말 */}
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">💡 팁</p>
              <ul className="space-y-1 text-blue-800">
                <li>• 정확히 0원으로 만들 수 있는 조합을 우선 추천합니다</li>
                <li>• 다양한 메뉴를 포함한 조합을 선호합니다</li>
                <li>• 동일 메뉴는 최대 5개까지만 포함됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}