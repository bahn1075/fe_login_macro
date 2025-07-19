# 브랜치별 ArgoCD 애플리케이션 관리

이 디렉토리는 `fe-login-macro` 프로젝트의 브랜치별 배포를 위한 ArgoCD 설정을 포함합니다.

## 파일 구조

```
argocd/
├── Chart.yaml                     # Helm 차트 메타데이터
├── values.yaml                    # 공통 values 파일 (브랜치별 오버라이드 가능)
├── application.yaml               # 기본 애플리케이션 설정
├── application-main.yaml          # main 브랜치용 애플리케이션
├── application-develop.yaml       # develop 브랜치용 애플리케이션
├── application-feature1.yaml      # feature1 브랜치용 애플리케이션
├── create-branch-app.sh          # 새 브랜치용 애플리케이션 생성 스크립트
├── README-branch-management.md    # 이 파일
└── templates/                     # Kubernetes 매니페스트 템플릿
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── _helpers.tpl
```

## 브랜치별 설정

각 브랜치는 독립적인 네임스페이스와 Ingress 호스트를 가집니다:

| 브랜치 | 애플리케이션 이름 | 네임스페이스 | Ingress 호스트 |
|--------|-------------------|--------------|----------------|
| main | fe-login-macro-main | macro-main | fe-macro-main.local |
| develop | fe-login-macro-develop | macro-develop | fe-macro-dev.local |
| feature1 | fe-login-macro-feature1 | macro-feature1 | fe-macro-feature1.local |

## 새 브랜치 애플리케이션 생성

### 자동 생성 (권장)

현재 브랜치용 애플리케이션을 자동으로 생성:
```bash
./create-branch-app.sh
```

특정 브랜치용 애플리케이션 생성:
```bash
./create-branch-app.sh feature/new-feature
```

### 수동 생성

1. 기존 application 파일을 복사:
```bash
cp application-main.yaml application-your-branch.yaml
```

2. 파일 내용 수정:
   - `metadata.name`: `fe-login-macro-your-branch`
   - `spec.source.targetRevision`: `your-branch`
   - `spec.destination.namespace`: `macro-your-branch`
   - Helm parameters 수정

## 배포 방법

### ArgoCD CLI 사용
```bash
# 애플리케이션 생성
argocd app create -f application-your-branch.yaml

# 애플리케이션 동기화
argocd app sync fe-login-macro-your-branch
```

### kubectl 사용
```bash
# 애플리케이션 생성
kubectl apply -f application-your-branch.yaml

# 상태 확인
kubectl get applications -n argocd
```

## 이미지 태그 관리

현재 설정에서는 모든 브랜치가 `latest` 태그를 사용합니다. Jenkins에서 빌드할 때:

1. 각 브랜치별로 이미지가 빌드되어 `latest` 태그로 푸시됩니다
2. ArgoCD가 자동으로 변경사항을 감지하고 배포합니다

### 브랜치별 이미지 태그 사용하기

특정 브랜치에서 고유한 이미지 태그를 사용하려면:

```bash
# Jenkins에서 브랜치별 태그로 빌드된 이미지 사용
kubectl patch application fe-login-macro-feature1 -n argocd --type='merge' -p='{"spec":{"source":{"helm":{"parameters":[{"name":"global.imageTag","value":"1.0.123-feature1-abcd1234"}]}}}}'
```

## 호스트 설정

로컬에서 테스트하려면 `/etc/hosts` 파일에 다음을 추가:

```
127.0.0.1 fe-macro-main.local
127.0.0.1 fe-macro-dev.local  
127.0.0.1 fe-macro-feature1.local
```

Kubernetes 클러스터의 Ingress IP가 다르다면 해당 IP로 설정하세요.

## 애플리케이션 삭제

```bash
# ArgoCD에서 애플리케이션 삭제
kubectl delete application fe-login-macro-your-branch -n argocd

# 네임스페이스도 함께 삭제 (주의!)
kubectl delete namespace macro-your-branch
```

## 주의사항

1. 각 브랜치는 독립적인 네임스페이스를 사용하므로 리소스 사용량을 모니터링하세요
2. 불필요한 브랜치 애플리케이션은 정기적으로 정리하세요
3. 프로덕션 환경에서는 브랜치별 배포 정책을 명확히 정의하세요
