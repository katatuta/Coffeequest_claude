// 잔액 소진 최적화 알고리즘 (배낭 문제 기반)

const MAX_SAME_ITEM = 5; // 동일 메뉴 최대 개수

// 메뉴 조합으로 정확히 목표 금액 만들기
export function findBudgetCombinations(remainingBudget, menus, maxCombinations = 5) {
  if (remainingBudget <= 0 || !menus || menus.length === 0) {
    return [];
  }

  const results = [];
  
  // 동적 프로그래밍으로 가능한 조합 찾기
  function findCombinations(target, items, currentCombo = []) {
    if (target === 0) {
      // 정확히 맞는 조합 발견
      results.push([...currentCombo]);
      return;
    }

    if (target < 0 || results.length >= maxCombinations * 3) {
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const count = currentCombo.filter(c => c.id === item.id).length;

      if (count < MAX_SAME_ITEM) {
        currentCombo.push(item);
        findCombinations(target - item.price, items, currentCombo);
        currentCombo.pop();
      }
    }
  }

  findCombinations(remainingBudget, menus);

  // 다양성 점수로 정렬
  const scoredResults = results.map(combo => ({
    items: combo,
    diversityScore: calculateDiversityScore(combo),
    totalPrice: combo.reduce((sum, item) => sum + item.price, 0)
  }));

  scoredResults.sort((a, b) => b.diversityScore - a.diversityScore);

  // 상위 N개 반환 (중복 제거)
  const uniqueResults = [];
  const seen = new Set();

  for (const result of scoredResults) {
    const key = result.items
      .map(item => `${item.id}`)
      .sort()
      .join('-');
    
    if (!seen.has(key) && uniqueResults.length < maxCombinations) {
      seen.add(key);
      uniqueResults.push(formatCombination(result.items));
    }
  }

  return uniqueResults;
}

// 다양성 점수 계산
function calculateDiversityScore(combo) {
  const uniqueItems = new Set(combo.map(item => item.id));
  const uniqueCount = uniqueItems.size;
  const totalCount = combo.length;

  // 서로 다른 메뉴가 많을수록 높은 점수
  return (uniqueCount / totalCount) * 100 + uniqueCount * 10;
}

// 조합을 보기 좋게 포맷
function formatCombination(combo) {
  const itemCounts = {};

  combo.forEach(item => {
    if (!itemCounts[item.id]) {
      itemCounts[item.id] = {
        ...item,
        count: 0
      };
    }
    itemCounts[item.id].count++;
  });

  const items = Object.values(itemCounts);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.count, 0);

  return {
    items,
    totalPrice,
    description: items.map(item => `${item.name} ${item.count}개`).join(', ')
  };
}

// 근사 조합 찾기 (정확히 맞는 조합이 없을 때)
export function findApproximateCombinations(remainingBudget, menus, tolerance = 100) {
  const results = [];

  for (let target = remainingBudget; target >= remainingBudget - tolerance; target--) {
    const combinations = findBudgetCombinations(target, menus, 2);
    if (combinations.length > 0) {
      results.push(...combinations);
      if (results.length >= 3) break;
    }
  }

  return results;
}