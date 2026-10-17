# 어휘 놀이터 · 수능 국어

## 올릴 파일 (GitHub 저장소 맨 위 폴더에)
- `index.html`
- `firebase-config.js`  ← 파이어베이스 값 넣은 뒤 올리기
- (`firestore.rules` 는 파이어베이스에 붙여넣는 용도라 올려도, 안 올려도 됩니다)

## 설정 순서
1. 파이어베이스 콘솔에서 프로젝트 만들기
2. 빌드 > Authentication > 시작하기 > 로그인 방법 > **Google** 사용 설정
3. Authentication > 설정 > 승인된 도메인 > **`내아이디.github.io`** 추가
4. 빌드 > Firestore Database > 데이터베이스 만들기
5. Firestore > 규칙 탭 > `firestore.rules` 내용 전체 붙여넣기 (이메일 수정!) > 게시
6. 프로젝트 설정 > 내 앱 > 웹(`</>`) 추가 > 나온 설정값을 `firebase-config.js` 에 입력
7. GitHub 저장소 Settings > Pages > Branch: main / (root) 저장
8. `https://내아이디.github.io/저장소이름/` 접속

## 주의
- 학생은 구글 계정으로 로그인합니다.
- AI 기능(오늘의 글 2편 쓰기, 자료 어휘 분석)은 Claude 안에서만 동작해서 이 방식에서는 빠집니다.
