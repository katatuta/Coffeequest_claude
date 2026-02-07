# ☕ 커피퀘스트 트래커

월 5만원 음료 예산을 효율적으로 관리하는 PWA 앱

## 📋 주요 기능

- 🔐 사용자 인증 (이메일 회원가입/로그인)
- 📊 월별 예산 관리 (월 5만원 자동 추적)
- ☕ 메뉴 관리 (수동 입력 + 엑셀 업로드)
- 🛒 구매 기록 (간편한 장바구니 방식)
- 💡 잔액 소진 최적화 추천 (배낭 문제 알고리즘)
- 📈 구매 통계 및 분석
- 📱 반응형 디자인 (모바일 우선)

## 🚀 빠른 시작

### 1. 설치

```bash
npm install
```

### 2. Firebase 설정

#### A. Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력

#### B. Firebase 앱 등록
1. 프로젝트 대시보드 → 웹 아이콘 클릭
2. 앱 닉네임 입력
3. 설정 정보 복사

#### C. Authentication 활성화
1. 좌측 메뉴 → Authentication → 시작하기
2. 이메일/비밀번호 활성화

#### D. Firestore 생성
1. 좌측 메뉴 → Firestore Database
2. 데이터베이스 만들기 → 테스트 모드
3. 위치: asia-northeast3 (Seoul)

### 3. 환경변수 설정

`.env` 파일 생성:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. 실행

```bash
npm run dev
```

http://localhost:5173 접속

## 📖 사용 방법

### 메뉴 등록
1. **수동 입력**: 메뉴 관리 → 추가
2. **엑셀 업로드**: 템플릿 다운로드 → 작성 → 업로드

### 구매 기록
1. 홈 화면 → 구매 기록
2. 메뉴 선택 + 수량 조절
3. 구매 완료

### 잔액 소진 추천
- 잔액 20,000원 이하 시 자동 배너
- 정확히 0원으로 만드는 조합 추천

## 🛠 기술 스택

- React 18 + Vite
- Tailwind CSS
- Firebase (Auth + Firestore)
- React Router v6
- Recharts, date-fns, xlsx

## 📁 프로젝트 구조

```
src/
├── config/       # Firebase 설정
├── hooks/        # useAuth
├── services/     # API 서비스
├── utils/        # budgetOptimizer
├── pages/        # 페이지 컴포넌트
└── App.jsx       # 라우팅
```

## 🐛 문제 해결

**Firebase 연결 오류**
→ `.env` 파일 확인

**메뉴 표시 안 됨**
→ Firestore 테스트 모드 확인

**빌드 오류**
```bash
rm -rf node_modules
npm install
```

## 📄 라이센스

MIT
