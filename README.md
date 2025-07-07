# 주차 예약 시스템 (Parking Reservation System)

다음 달 주차 예약을 위한 매크로 스케줄러 생성 시스템입니다.

## 주요 기능

### 🗓️ 한국 달력 표시
- 다음 달 한국 달력을 메인 화면에 표시
- 직관적인 날짜 선택 인터페이스
- 오늘 날짜 하이라이트 표시

### 📅 날짜 선택 시스템
- 정확히 8개의 날짜를 선택해야 함
- 8개가 아닌 경우 경고 메시지 표시
- 선택된 날짜는 실시간으로 표시 및 관리

### 🤖 자동 스케줄러 생성
- 선택한 8개 날짜의 00:01 시각에 실행되는 Windows 스케줄러 생성
- `reserve.exe` 매크로 프로그램 자동 실행
- 관리자 권한으로 스케줄러 등록

### 📁 배치 파일 다운로드
- 원클릭으로 모든 스케줄러를 등록할 수 있는 `.bat` 파일 생성
- 사용자가 직접 실행하여 스케줄러 등록 가능

## 사용 방법

### 1. 프로젝트 설치 및 실행

#### 로컬 개발 환경
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

#### Docker 환경
```bash
# 프로덕션 빌드 및 실행
npm run docker:build
npm run docker:run

# 또는 Docker Compose 사용
npm run docker:compose-prod

# 개발 환경 (핫 리로드 지원)
npm run docker:compose-dev
```

#### Docker 명령어
```bash
# 프로덕션 이미지 빌드
docker build -t fe-login-macro .

# 개발 이미지 빌드
docker build -f Dockerfile.dev -t fe-login-macro-dev .

# 이미지 확인
cd /app/fe_login_macro && docker images | grep fe-login-macro

# 프로덕션 컨테이너 실행
docker run -p 80:80 fe-login-macro

# 개발 컨테이너 실행 (볼륨 마운트)
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules fe-login-macro-dev

# Docker Compose로 개발 환경 실행
docker-compose --profile dev up --build

# Docker Compose로 프로덕션 환경 실행
docker-compose --profile prod up --build -d
```

### 2. 날짜 선택
1. 화면에 표시된 다음 달 달력에서 예약할 날짜를 클릭
2. 정확히 8개의 날짜를 선택 (8개 미만 또는 초과 시 경고 메시지 표시)
3. 선택된 날짜는 파란색 태그로 표시되며, 'X' 버튼으로 제거 가능

### 3. 스케줄러 생성
1. 8개 날짜 선택 완료 후 "스케줄러 배치 파일 생성" 버튼 클릭
2. 생성된 배치 파일 코드 확인
3. "배치 파일 다운로드 (.bat)" 버튼으로 파일 다운로드

### 4. 스케줄러 등록
1. 다운로드한 `.bat` 파일을 **관리자 권한으로 실행**
2. Windows 스케줄러에 8개 작업이 자동 등록됨
3. 각 날짜의 00:01에 `reserve.exe` 프로그램이 자동 실행

## 기술 스택

### Frontend
- **React 18** - 최신 React 기능 활용
- **TypeScript** - 타입 안정성 확보
- **CSS3** - 모던 UI 디자인
- **Responsive Design** - 모바일 친화적 디자인

### 주요 React 기능
- **useState** - 상태 관리
- **useEffect** - 생명주기 관리
- **useCallback** - 성능 최적화
- **Functional Components** - 최신 React 패턴

## 파일 구조

```
/app/fe_login_macro/
├── public/
│   └── index.html                 # HTML 템플릿
├── src/
│   ├── App.tsx                    # 메인 컴포넌트
│   ├── App.css                    # 스타일시트
│   ├── index.tsx                  # 애플리케이션 엔트리포인트
│   └── react-app-env.d.ts        # TypeScript 타입 정의
├── Dockerfile                     # 프로덕션 Docker 이미지
├── Dockerfile.dev                 # 개발용 Docker 이미지
├── docker-compose.yml             # Docker Compose 설정
├── nginx.conf                     # Nginx 설정 파일
├── .dockerignore                  # Docker 빌드 제외 파일
├── package.json                   # 프로젝트 설정
├── tsconfig.json                  # TypeScript 설정
└── README.md                      # 프로젝트 문서
```

## Docker 배포

### 🐳 Docker 특징
- **멀티 스테이지 빌드**: 최적화된 프로덕션 이미지 생성
- **Nginx 서버**: 정적 파일 서빙 및 SPA 라우팅 지원
- **개발/프로덕션 환경**: 각각 다른 Docker 설정 제공
- **볼륨 마운트**: 개발 환경에서 핫 리로드 지원

### 🚀 배포 환경별 실행
```bash
# 개발 환경 (http://localhost:3000)
docker-compose --profile dev up --build

# 프로덕션 환경 (http://localhost:80)
docker-compose --profile prod up --build -d

# 컨테이너 정지
docker-compose down
```

## 생성되는 배치 파일 예시

```batch
@echo off
chcp 65001
echo ==========================================
echo 주차 예약 시스템 - 스케줄러 등록
echo ==========================================
echo.
echo 다음 날짜에 대한 스케줄러를 등록합니다:
echo 1. 2025년 8월 1일 (금)
echo 2. 2025년 8월 8일 (금)
echo 3. 2025년 8월 15일 (금)
echo 4. 2025년 8월 22일 (금)
echo 5. 2025년 8월 29일 (금)
echo 6. 2025년 8월 5일 (화)
echo 7. 2025년 8월 12일 (화)
echo 8. 2025년 8월 19일 (화)
echo.
echo 관리자 권한이 필요합니다. 계속하시겠습니까?
pause
echo.
echo 스케줄러 등록 중...
echo.

REM 작업 1: 2025년 8월 1일 (금)
schtasks /create /tn "ReservationMacro_2025_08_01" /tr "C:\\path\\to\\reserve.exe" /sc once /sd 2025-08-01 /st 00:01 /ru SYSTEM /f
if %errorlevel% neq 0 (
    echo 작업 1 생성 실패: 2025년 8월 1일 (금)
) else (
    echo 작업 1 생성 성공: 2025년 8월 1일 (금)
)

REM ... (나머지 7개 작업)

echo.
echo ==========================================
echo 완료! 등록된 작업을 확인하려면:
echo schtasks /query /tn "ReservationMacro_*"
echo ==========================================
pause
```

## 중요 사항

### ⚠️ 주의사항
1. **관리자 권한 필요**: 배치 파일은 반드시 관리자 권한으로 실행해야 합니다.
2. **reserve.exe 경로**: 배치 파일의 `C:\\path\\to\\reserve.exe` 경로를 실제 파일 경로로 수정해야 합니다.
3. **정확히 8개 날짜**: 한 달에 정확히 8개의 날짜만 선택 가능합니다.

### 🔧 설정 방법
1. `reserve.exe` 파일을 적절한 위치에 배치
2. 생성된 배치 파일에서 경로를 실제 경로로 수정
3. 관리자 권한으로 배치 파일 실행

### 📊 스케줄러 확인
```cmd
# 등록된 스케줄러 확인
schtasks /query /tn "ReservationMacro_*"

# 특정 스케줄러 삭제
schtasks /delete /tn "ReservationMacro_2025_08_01"
```

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 문의사항

프로젝트 관련 문의사항이 있으시면 GitHub Issues를 통해 연락해 주세요.
