// 관리자 이메일 목록
// 이 이메일들을 가진 사용자만 메뉴 관리 가능

export const ADMIN_EMAILS = [
  'katatuta@gmail.com',
];

// 환경변수에서 추가 관리자 가져오기 (선택사항)
if (import.meta.env.VITE_ADMIN_EMAILS) {
  const envAdmins = import.meta.env.VITE_ADMIN_EMAILS.split(',').map(email => email.trim());
  ADMIN_EMAILS.push(...envAdmins);
}

// 관리자 권한 확인
export function isAdmin(userEmail) {
  if (!userEmail) return false;
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
}
