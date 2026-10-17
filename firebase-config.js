/* 파이어베이스 콘솔 > 프로젝트 설정 > 내 앱(웹) 에서 복사한 값으로 바꿔 주세요.
   (이 값은 공개되어도 괜찮아요. 보안은 Firestore 규칙이 지켜 줍니다.) */
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/* 교사(관리자)로 쓸 구글 계정 이메일 - firestore.rules 의 이메일과 똑같이 적어야 해요. */
window.TEACHER_EMAIL = "teacher@gmail.com";
