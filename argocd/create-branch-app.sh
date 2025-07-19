#!/bin/bash

# 브랜치별 ArgoCD 애플리케이션 배포 스크립트

BRANCH_NAME=${1:-$(git branch --show-current)}
CLEAN_BRANCH_NAME=$(echo "$BRANCH_NAME" | sed 's/[^a-zA-Z0-9._-]/-/g' | tr '[:upper:]' '[:lower:]')

# 변수 설정
APP_NAME="fe-login-macro-${CLEAN_BRANCH_NAME}"
NAMESPACE="macro-${CLEAN_BRANCH_NAME}"
INGRESS_HOST="fe-macro-${CLEAN_BRANCH_NAME}.local"

echo "🚀 브랜치별 ArgoCD 애플리케이션 생성: ${BRANCH_NAME}"
echo "   - App Name: ${APP_NAME}"
echo "   - Namespace: ${NAMESPACE}"
echo "   - Ingress Host: ${INGRESS_HOST}"

# application.yaml 생성
cat > "application-${CLEAN_BRANCH_NAME}.yaml" << EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${APP_NAME}
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
  labels:
    app: fe-login-macro
    branch: ${CLEAN_BRANCH_NAME}
spec:
  project: default
  source:
    repoURL: https://github.com/bahn1075/fe_login_macro.git
    targetRevision: ${BRANCH_NAME}
    path: argocd
    helm:
      valueFiles:
        - values.yaml
      parameters:
        - name: global.appName
          value: "${APP_NAME}"
        - name: global.namespace
          value: "${NAMESPACE}"
        - name: global.imageTag
          value: "latest"
        - name: global.ingressHost
          value: "${INGRESS_HOST}"
        - name: global.branchName
          value: "${BRANCH_NAME}"
  destination:
    server: https://kubernetes.default.svc
    namespace: ${NAMESPACE}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  revisionHistoryLimit: 10
EOF

echo "✅ application-${CLEAN_BRANCH_NAME}.yaml 파일이 생성되었습니다."
echo ""
echo "📋 다음 명령어로 ArgoCD에 배포하세요:"
echo "   kubectl apply -f application-${CLEAN_BRANCH_NAME}.yaml"
echo ""
echo "🌐 애플리케이션에 접근하려면 다음 호스트를 /etc/hosts에 추가하세요:"
echo "   <your-k8s-ingress-ip> ${INGRESS_HOST}"
