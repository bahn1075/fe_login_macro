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

#### 1. Docker 설치 문제
```bash
# 문제: docker: not found
# 해결: Docker 및 Docker Pipeline Plugin 설치 필요

# Jenkins Plugin Manager에서 설치:
# - Docker Pipeline Plugin
# - Docker plugin (선택사항)

# Jenkins 에이전트에 Docker 설치 (Ubuntu/Debian):
sudo apt-get update && sudo apt-get install docker.io
sudo usermod -aG docker jenkins
sudo systemctl restart docker jenkins
```

#### 2. Harbor 인증 실패
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

## 일반적인 문제 해결

### ❓ 브랜치 태그에 "head"가 표시되는 문제

**문제**: 태그가 `1.0.8-head-504a333d` 형태로 생성됨
**원인**: Jenkins가 detached HEAD 상태에서 실행되어 정확한 브랜치명을 감지하지 못함

**해결방법**:

#### 1. Jenkins Job 설정 변경
```bash
# Jenkins Job Configuration > Source Code Management > Git
# Branches to build: */main (또는 원하는 브랜치)
# Additional Behaviours: "Check out to specific local branch" 추가
# Branch name: main (또는 원하는 브랜치명)
```

#### 2. Multibranch Pipeline 사용 (권장)
```bash
# Jenkins > New Item > Multibranch Pipeline
# 자동으로 BRANCH_NAME 환경변수 설정됨
# 각 브랜치별로 자동 빌드 생성
```

#### 3. 수동으로 브랜치명 지정
```groovy
// Jenkinsfile에서 직접 설정
environment {
    MANUAL_BRANCH_NAME = "main"  // 또는 원하는 브랜치명
}
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

## Jenkins Docker Plugin 설정 가이드

### 🐳 설치된 플러그인 확인
Jenkins > Manage Jenkins > Plugins > Installed 에서 확인:
- ✅ **Docker Pipeline Plugin** (설치 완료)
- ✅ **Docker plugin** (옵션, 설치 완료)

### 📋 Jenkins에서 Docker 사용 설정

#### 1. Docker Tool 설정 (선택사항)
```bash
# Jenkins > Manage Jenkins > Tools > Docker installations
Name: docker
Install automatically: ✅ 체크
Installer: Download from docker.com
Docker version: latest
```

#### 2. Jenkins 에이전트 Docker 권한 확인
```bash
# Jenkins 서버에서 실행
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins

# 권한 테스트
sudo -u jenkins docker ps
sudo -u jenkins docker --version
```

#### 3. 현재 Jenkinsfile 사용법
현재 작성된 Jenkinsfile은 **Docker Pipeline Plugin**을 사용합니다:

```groovy
// Docker 이미지 빌드
def dockerImage = docker.build(
    env.FULL_IMAGE_TAG,
    "--file Dockerfile ."
)

// Harbor 레지스트리 로그인 및 푸시
docker.withRegistry("https://${HARBOR_REGISTRY}", HARBOR_CREDENTIAL_ID) {
    sh "docker push ${env.FULL_IMAGE_TAG}"
}
```

### 🎯 **지금 바로 해야 할 3가지**

#### ✅ **1단계: Harbor Credential 생성**
```bash
Jenkins → Manage Jenkins → Credentials → Global → Add Credentials

Type: "Username with password" 선택
ID: harbor (정확히 이렇게!)
Username: [Harbor 로그인 아이디]
Password: [Harbor 로그인 비밀번호]
```

#### ✅ **2단계: Jenkins Job Branch 설정**
```bash
Job Configuration → Source Code Management → Git
Branches to build: */develop (또는 */main)

Additional Behaviours → Add:
"Check out to specific local branch" 선택
Branch name: develop (브랜치명 입력)
```

#### ✅ **3단계: 빌드 실행**
```bash
Jenkins Dashboard → [Job 이름] → "Build Now" 클릭
```

### 🔍 **빌드 실패 시 확인사항**

#### Docker 관련 에러
```bash
# 에러: docker: command not found
→ Jenkins 에이전트에 Docker 설치 필요

# 에러: permission denied
→ Jenkins 사용자 권한 설정 필요:
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

#### Harbor 관련 에러  
```bash
# 에러: authentication required
→ Harbor credential ID가 "harbor"인지 확인
→ Harbor 사용자명/비밀번호 정확성 확인

# 에러: repository does not exist
→ Harbor에서 fe_login_macro/dev 저장소 생성 필요
```

## Kubernetes 환경 설정

### 🎯 **Kubernetes 클러스터에서 Jenkins 실행**

이 파이프라인은 **Kubernetes Pod agent**를 사용하여 실행됩니다:

#### Pod 구성:
- **docker container**: Docker CLI 환경 (Host Docker 소켓 사용)
- **kubectl container**: Kubernetes 명령어 실행용 (확장 가능)
- **Volume**: Host Docker 소켓 마운트 (`/var/run/docker.sock`)

#### 설정 방식:
- ✅ **Docker 소켓 마운트**: Host의 Docker 데몬 사용
- ❌ **Docker-in-Docker (DinD)**: 복잡하고 권한 문제 발생 가능

#### 필수 요구사항:
1. **Jenkins Kubernetes Plugin** 설치
2. **Kubernetes 클러스터** 접근 권한  
3. **Host Docker 소켓** 접근 권한
4. **Harbor credential** 설정

### 📋 **Kubernetes 설정 확인사항**

#### 1. Jenkins Kubernetes Plugin 설정
```bash
Jenkins > Manage Jenkins > Configure System > Cloud

# Kubernetes 클러스터 설정:
Name: kubernetes
Kubernetes URL: https://kubernetes.default.svc.cluster.local
Namespace: jenkins (또는 Jenkins가 실행 중인 네임스페이스)
```

#### 2. RBAC 권한 설정
Jenkins ServiceAccount에 Pod 생성 권한이 필요합니다:

```yaml
# jenkins-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: jenkins
  namespace: jenkins
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: jenkins-pod-manager
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: jenkins-pod-manager
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: jenkins-pod-manager
subjects:
- kind: ServiceAccount
  name: jenkins
  namespace: jenkins
```

#### 3. Docker 소켓 접근 설정
Host의 Docker 소켓에 접근할 수 있어야 합니다:

**방법 1: Node의 Docker 소켓 권한 설정**
```bash
# 각 Kubernetes Node에서 실행
sudo chmod 666 /var/run/docker.sock
```

**방법 2: Pod에서 Docker 그룹 추가**
```yaml
# Jenkinsfile의 Pod 설정에 추가
spec:
  securityContext:
    fsGroup: 999  # Docker 그룹 ID
```
