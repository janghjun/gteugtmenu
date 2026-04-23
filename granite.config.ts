/**
 * Apps in Toss (AIT) 앱 설정
 *
 * ⚠️  이 파일은 @granite-js/cli 설치 후 실제 스키마에 맞게 검증 필요.
 *     AIT 공식 문서: https://docs.toss.im/ait (사내 접근 필요)
 *
 * 설치:
 *   npm install --save-dev @granite-js/cli   (또는 AIT SDK 패키지)
 *
 * 빌드:
 *   npx granite build   →  dist.ait 생성
 */

const config = {
  app: {
    /** 앱 식별자 — AIT 콘솔에 등록한 appName과 일치해야 함 */
    appId: 'food-time-quiz',

    /** 토스앱 미니앱 목록에 표시될 이름 */
    name: '먹퀴즈',

    /** 512×512 이상 권장 — 현재 파일: 600×600 PNG */
    icon: './public/assets/icons/icon-light.png',

    /** 다크모드용 아이콘 */
    iconDark: './public/assets/icons/icon-dark.png',

    /** 앱 버전 */
    version: '1.0.0',
  },

  brand: {
    /** 주요 브랜드 컬러 (토스 블루 계열) */
    primaryColor: '#3182F6',

    /** 앱 설명 — 미니앱 상세 페이지 노출 */
    description: '유행 음식 맞히는 1분 퀴즈',
  },

  build: {
    /** Vite 빌드 결과 디렉터리 */
    outDir: 'dist',
  },
}

export default config
