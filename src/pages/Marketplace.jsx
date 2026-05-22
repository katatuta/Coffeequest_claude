import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getCurrentBudgetStatus } from '../services/budgetService';
import {
  createListing,
  getActiveListings,
  getMyListings,
  getMyTransactions,
  getTransactionsForSeller,
  requestPurchase,
  confirmTransaction,
  cancelListing,
} from '../services/marketplaceService';
import { ArrowLeft, Store, ShoppingBag, Clock, Check, X, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('market');
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [sellerTransactions, setSellerTransactions] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showListModal, setShowListModal] = useState(false);
  const [listAmount, setListAmount] = useState('');

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    try {
      setLoading(true);
      const [status, active, mine, myTx, sellerTx] = await Promise.all([
        getCurrentBudgetStatus(user.uid),
        getActiveListings(),
        getMyListings(user.uid),
        getMyTransactions(user.uid),
        getTransactionsForSeller(user.uid),
      ]);
      setBudgetStatus(status);
      setListings(active);
      setMyListings(mine);
      setMyTransactions(myTx);
      setSellerTransactions(sellerTx);
    } catch (error) {
      console.error('Error loading marketplace:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateListing() {
    const amount = parseInt(listAmount);
    if (!amount || amount <= 0) return;
    if (budgetStatus && amount > budgetStatus.remaining) {
      alert('잔액보다 많은 금액은 등록할 수 없습니다.');
      return;
    }
    try {
      const name = user.displayName || user.email;
      await createListing(user.uid, name, amount);
      setShowListModal(false);
      setListAmount('');
      await loadData();
    } catch (error) {
      console.error('Error creating listing:', error);
    }
  }

  async function handleRequestPurchase() {
    const amount = parseInt(buyAmount);
    if (!amount || amount <= 0) return;
    if (amount > selectedListing.remainingAmount) {
      alert('잔량보다 많은 금액은 구매할 수 없습니다.');
      return;
    }
    try {
      const name = user.displayName || user.email;
      await requestPurchase(selectedListing.id, selectedListing, user.uid, name, amount);
      setShowBuyModal(false);
      setBuyAmount('');
      setSelectedListing(null);
      await loadData();
    } catch (error) {
      console.error('Error requesting purchase:', error);
    }
  }

  async function handleConfirm(tx) {
    try {
      await confirmTransaction(tx.id, tx.listingId, tx.requestedAmount, tx.sellerId);
      await loadData();
    } catch (error) {
      console.error('Error confirming transaction:', error);
    }
  }

  async function handleCancelListing(listingId) {
    try {
      await cancelListing(listingId);
      await loadData();
    } catch (error) {
      console.error('Error cancelling listing:', error);
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

  const otherListings = listings.filter(l => l.sellerId !== user.uid);
  const pendingSellerTx = sellerTransactions.filter(t => t.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Store className="w-5 h-5 text-primary-500" />
          <h1 className="text-lg font-bold text-gray-900 flex-1">잔액 장터</h1>
          <button
            onClick={() => setShowListModal(true)}
            className="btn-primary text-sm"
          >
            잔액 등록
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2">
          {['market', 'my'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {tab === 'market' ? '장터' : `내 거래${pendingSellerTx.length > 0 ? ` (${pendingSellerTx.length})` : ''}`}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {activeTab === 'market' && (
          <>
            {otherListings.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>등록된 잔액이 없습니다.</p>
              </div>
            ) : (
              otherListings.map(listing => (
                <div key={listing.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">익명의 판매자</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {listing.remainingAmount.toLocaleString()}원
                        {listing.remainingAmount < listing.totalAmount && (
                          <span className="text-sm font-normal text-gray-400 ml-2">
                            (원래 {listing.totalAmount.toLocaleString()}원)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-primary-600 mt-1">
                        10% 할인 — 최대 {Math.floor(listing.remainingAmount * 0.9).toLocaleString()}원에 구매
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedListing(listing); setBuyAmount(''); setShowBuyModal(true); }}
                      className="btn-primary text-sm"
                    >
                      구매 신청
                    </button>
                  </div>
                  {listing.createdAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {format(listing.createdAt, 'MM월 dd일 HH:mm', { locale: ko })}
                    </p>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'my' && (
          <>
            {/* 판매 — 들어온 신청 */}
            {pendingSellerTx.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-5 h-5 text-primary-500" />
                  <h2 className="font-semibold text-gray-900">받은 구매 신청</h2>
                </div>
                <div className="space-y-3">
                  {pendingSellerTx.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">{tx.buyerName}</p>
                        <p className="text-sm text-gray-600">
                          {tx.requestedAmount.toLocaleString()}원 요청
                          <span className="text-primary-600 ml-1">
                            ({tx.discountedPrice.toLocaleString()}원 받기)
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleConfirm(tx)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm"
                      >
                        <Check className="w-4 h-4" />
                        완료 확인
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 판매 — 내 등록 목록 */}
            {myListings.filter(l => l.status === 'active').length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-5 h-5 text-primary-500" />
                  <h2 className="font-semibold text-gray-900">내 판매 등록</h2>
                </div>
                <div className="space-y-3">
                  {myListings.filter(l => l.status === 'active').map(listing => (
                    <div key={listing.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">
                          {listing.remainingAmount.toLocaleString()}원 남음
                        </p>
                        <p className="text-sm text-gray-500">
                          원래 {listing.totalAmount.toLocaleString()}원 등록
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancelListing(listing.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                      >
                        <X className="w-4 h-4" />
                        취소
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 구매 — 내가 신청한 거래 */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-gray-900">내 구매 신청</h2>
              </div>
              {myTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">신청한 거래가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {myTransactions.map(tx => (
                    <div key={tx.id} className="py-2 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {tx.requestedAmount.toLocaleString()}원
                            <span className="text-primary-600 ml-1 font-normal text-sm">
                              ({tx.discountedPrice.toLocaleString()}원 지급)
                            </span>
                          </p>
                          {tx.status === 'completed' ? (
                            <p className="text-sm text-green-600 mt-0.5">
                              <Check className="w-3 h-3 inline mr-1" />
                              판매자: <span className="font-semibold">{tx.sellerName}</span>
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 mt-0.5">
                              <Clock className="w-3 h-3 inline mr-1" />
                              상대방 확인 대기 중
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          tx.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tx.status === 'completed' ? '완료' : '대기'}
                        </span>
                      </div>
                      {tx.createdAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          {format(tx.createdAt, 'MM월 dd일 HH:mm', { locale: ko })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* 잔액 등록 모달 */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">잔액 등록</h2>
            {budgetStatus && (
              <p className="text-sm text-gray-600">
                현재 잔액: <span className="font-semibold text-primary-600">{budgetStatus.remaining.toLocaleString()}원</span>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">등록 금액</label>
              <input
                type="number"
                value={listAmount}
                onChange={e => setListAmount(e.target.value)}
                placeholder="판매할 금액 입력"
                className="input-field w-full"
                max={budgetStatus?.remaining}
                min={1}
              />
              {listAmount && parseInt(listAmount) > 0 && (
                <p className="text-sm text-primary-600 mt-1">
                  구매자는 최대 {Math.floor(parseInt(listAmount) * 0.9).toLocaleString()}원에 구매합니다
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowListModal(false); setListAmount(''); }} className="btn-secondary flex-1">
                취소
              </button>
              <button onClick={handleCreateListing} className="btn-primary flex-1">
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 구매 신청 모달 */}
      {showBuyModal && selectedListing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">구매 신청</h2>
            <p className="text-sm text-gray-600">
              최대 구매 가능: <span className="font-semibold text-primary-600">{selectedListing.remainingAmount.toLocaleString()}원</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">구매 금액</label>
              <input
                type="number"
                value={buyAmount}
                onChange={e => setBuyAmount(e.target.value)}
                placeholder="구매할 금액 입력"
                className="input-field w-full"
                max={selectedListing.remainingAmount}
                min={1}
              />
              {buyAmount && parseInt(buyAmount) > 0 && (
                <p className="text-sm text-primary-600 mt-1">
                  실제 지급 금액: <span className="font-bold">{Math.floor(parseInt(buyAmount) * 0.9).toLocaleString()}원</span>
                  <span className="text-gray-500 ml-1">(10% 할인)</span>
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              신청 후 판매자와 직접 결제(카카오페이 등)를 진행하세요. 판매자가 확인하면 이름이 공개됩니다.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowBuyModal(false); setBuyAmount(''); setSelectedListing(null); }} className="btn-secondary flex-1">
                취소
              </button>
              <button onClick={handleRequestPurchase} className="btn-primary flex-1">
                신청
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
