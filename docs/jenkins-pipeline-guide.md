# Jenkins Pipeline 설정 가이드

## 개요
이 Jenkinsfile은 주차 예약 시스템(fe_login_macro) React 프로젝트의 Docker 이미지를 빌드하고 Harbor 레지스트리에 푸시하는 CI/CD 파이프라인입니다.

## 파이프라인 기능

### 🏷️ 태그 생성 규칙
```
{major}.{minor}.{patch}-{branch}-{commit_id}
```

**예시:**
- `1.0.15-main-a1b2c3d4`
- `1.0.16-feature-auth-e5f6g7h8`
- `1.0.17-hotfix-bug-i9j0k1l2`

### 🐳 Docker 이미지 정보
- **베이스 이미지**: `node:18-alpine` → `nginx:alpine`
- **멀티 스테이지 빌드**: 최적화된 프로덕션 이미지
- **최종 이미지 크기**: 약 53MB

### 🏢 Harbor 레지스트리 설정
- **프로젝트**: `fe_login_macro`
- **리포지토리**: `dev`
- **인증**: Jenkins credential `harbor`

## 필수 사전 설정

### 1. Jenkins 플러그인
다음 플러그인들이 설치되어 있어야 합니다:
- **Docker Pipeline Plugin**
- **Harbor Plugin** ✅ (이미 설치됨)
- **Git Plugin**
- **Pipeline Plugin**

### 2. Jenkins Credentials
Harbor 레지스트리 접근을 위한 credential을 생성해야 합니다:

```bash
# Jenkins > Manage Jenkins > Credentials > Global
# ID: harbor
# Type: Username with password
# Username: [Harbor 사용자명]
# Password: [Harbor 비밀번호 또는 토큰]
```

### 3. 환경 변수 설정
Jenkins 시스템 설정에서 다음 환경 변수를 설정할 수 있습니다:

```bash
# Jenkins > Manage Jenkins > Configure System > Global properties
HARBOR_URL=your-harbor-registry.example.com
```

## 파이프라인 단계별 설명

### Stage 1: Checkout
```groovy
- Git 저장소에서 소스 코드 체크아웃
- Git 커밋 ID (8자리 단축형) 추출
- 브랜치명 정리 (Docker 태그 규칙 준수)
```

### Stage 2: Build Version Tag
```groovy
- SemVer 형식의 버전 태그 생성
- 브랜치명과 커밋 ID 조합
- latest 태그도 함께 생성
```

### Stage 3: Docker Build
```groovy
- Dockerfile을 사용하여 React 앱 빌드
- 멀티 스테이지 빌드로 최적화된 이미지 생성
- 버전 태그와 latest 태그 모두 적용
```

### Stage 4: Docker Push to Harbor
```groovy
- Harbor 레지스트리에 로그인
- 버전별 태그와 latest 태그 모두 푸시
- fe_login_macro/dev 리포지토리에 저장
```

### Stage 5: Clean Up
```groovy
- 로컬 Docker 이미지 정리
- 디스크 공간 확보
```

## 사용 방법

### 1. Jenkins 파이프라인 생성
```bash
1. Jenkins 대시보드 > New Item
2. Pipeline 타입 선택
3. Pipeline script from SCM 선택
4. Git repository URL 입력
5. Script Path: Jenkinsfile
```

### 2. 파이프라인 실행
```bash
# 수동 실행
Jenkins > [파이프라인명] > Build Now

# Git 웹훅 트리거 (옵션)
- GitHub/GitLab 웹훅 설정
- Push 시 자동 빌드 실행
```

### 3. Harbor에서 이미지 확인
```bash
# Harbor 웹 UI에서 확인
https://your-harbor-registry.example.com
→ Projects → fe_login_macro → Repositories → dev

# Docker CLI로 확인
docker pull harbor.example.com/fe_login_macro/dev:latest
docker pull harbor.example.com/fe_login_macro/dev:1.0.15-main-a1b2c3d4
```

## 빌드 결과 예시

### 성공적인 빌드 시
```bash
✅ Pipeline succeeded!
Docker images have been successfully pushed to Harbor:
  Registry: harbor.example.com
  Project: fe_login_macro
  Repository: dev
  Version Tag: 1.0.15-main-a1b2c3d4

Image Tags Created:
  - harbor.example.com/fe_login_macro/dev:1.0.15-main-a1b2c3d4
  - harbor.example.com/fe_login_macro/dev:latest
```

### 파이프라인 소요 시간
- **체크아웃**: ~10초
- **Docker 빌드**: ~2-3분
- **Harbor 푸시**: ~30초-1분
- **정리**: ~10초
- **총 소요 시간**: 약 3-5분

## 트러블슈팅

### 일반적인 문제와 해결방법

#### 1. Harbor 인증 실패
```bash
# 문제: docker login failed
# 해결: Jenkins credential 확인
# - credential ID가 'harbor'인지 확인
# - 사용자명/비밀번호가 정확한지 확인
```

#### 2. Docker 빌드 실패
```bash
# 문제: npm install 실패
# 해결: package.json 의존성 확인
# - Node.js 버전 호환성 확인
# - npm 캐시 정리 옵션 추가
```

#### 3. 네트워크 연결 문제
```bash
# 문제: Harbor 레지스트리 연결 실패
# 해결: 네트워크 설정 확인
# - Jenkins 서버에서 Harbor 접근 가능한지 확인
# - 방화벽 설정 확인
```

#### 4. 디스크 공간 부족
```bash
# 문제: No space left on device
# 해결: Docker 이미지 정리
docker system prune -af
docker volume prune -f
```

## 고급 설정

### 버전 관리 커스터마이징
```groovy
// Jenkinsfile에서 버전 설정 변경
environment {
    MAJOR_VERSION = "2"  // 메이저 버전 변경
    MINOR_VERSION = "1"  // 마이너 버전 변경
}
```

### 조건부 빌드
```groovy
// 특정 브랜치에서만 빌드
when {
    anyOf {
        branch 'main'
        branch 'develop'
        branch 'release/*'
    }
}
```

### 알림 설정
```groovy
// 빌드 완료 시 Slack 알림 (Slack 플러그인 필요)
post {
    success {
        slackSend channel: '#deployments',
                  message: "✅ ${env.JOB_NAME} 빌드 성공: ${env.VERSION_TAG}"
    }
}
```

## 보안 고려사항

### 1. Credential 관리
- Harbor 비밀번호는 Jenkins Credentials에서만 관리
- 파이프라인 로그에 민감 정보 노출 방지

### 2. 이미지 스캔
```groovy
// Harbor의 이미지 취약점 스캔 활용 (옵션)
stage('Security Scan') {
    steps {
        script {
            // Harbor CLI 또는 API를 통한 스캔 실행
        }
    }
}
```

### 3. 네트워크 보안
- Harbor 레지스트리 HTTPS 사용
- 내부 네트워크에서만 접근 가능하도록 설정

## 참고 자료

- [Jenkins Pipeline 문서](https://www.jenkins.io/doc/book/pipeline/)
- [Docker Pipeline 플러그인](https://plugins.jenkins.io/docker-workflow/)
- [Harbor 문서](https://goharbor.io/docs/)
- [SemVer 규칙](https://semver.org/)
