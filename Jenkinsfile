pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins: worker
spec:
  containers:
  - name: docker
    image: docker:24-cli
    command:
    - cat
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
    resources:
      requests:
        memory: "256Mi"
        cpu: "100m"
      limits:
        memory: "1Gi"
        cpu: "500m"
  - name: kubectl
    image: bitnami/kubectl:latest
    command:
    - cat
    tty: true
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
      type: Socket
"""
        }
    }
    
    environment {
        // Harbor 설정 - Kubernetes 내부 서비스 사용
        HARBOR_REGISTRY = "${env.HARBOR_URL ?: 'harbor-core.harbor.svc.cluster.local'}"
        HARBOR_PROJECT = "fe_login_macro"
        HARBOR_REPO = "dev"
        HARBOR_CREDENTIAL_ID = "harbor"
        
        // 이미지 이름 설정
        IMAGE_NAME = "${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${HARBOR_REPO}"
        
        // SemVer 기본값
        MAJOR_VERSION = "1"
        MINOR_VERSION = "0"
        PATCH_VERSION = "${env.BUILD_NUMBER ?: '0'}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    // Git 정보 수집
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short=8 HEAD",
                        returnStdout: true
                    ).trim()
                    
                    // 브랜치명 가져오기 (Jenkins 환경변수 우선 사용)
                    if (env.BRANCH_NAME) {
                        // Multibranch Pipeline의 경우
                        env.GIT_BRANCH_NAME = env.BRANCH_NAME
                    } else if (env.GIT_BRANCH) {
                        // SCM에서 설정된 브랜치
                        env.GIT_BRANCH_NAME = env.GIT_BRANCH.replaceAll(/^origin\//, '')
                    } else {
                        // Git 명령어로 직접 확인
                        def branchName = sh(
                            script: """
                                git symbolic-ref --short HEAD 2>/dev/null || \
                                git describe --all --exact-match HEAD 2>/dev/null | sed 's/^.*\\///' || \
                                git name-rev --name-only HEAD 2>/dev/null | sed 's/^.*\\///' || \
                                echo 'unknown'
                            """,
                            returnStdout: true
                        ).trim()
                        env.GIT_BRANCH_NAME = branchName
                    }
                    
                    // 브랜치명에서 특수문자 제거 (Docker 태그 규칙 준수)
                    env.CLEAN_BRANCH_NAME = env.GIT_BRANCH_NAME.replaceAll(/[^a-zA-Z0-9._-]/, '-').toLowerCase()
                    
                    echo "Git Commit: ${env.GIT_COMMIT_SHORT}"
                    echo "Git Branch: ${env.GIT_BRANCH_NAME}"
                    echo "Clean Branch Name: ${env.CLEAN_BRANCH_NAME}"
                }
            }
        }
        
        stage('Build Version Tag') {
            steps {
                script {
                    // SemVer + Branch + Commit ID 형태의 태그 생성
                    env.VERSION_TAG = "${MAJOR_VERSION}.${MINOR_VERSION}.${PATCH_VERSION}-${env.CLEAN_BRANCH_NAME}-${env.GIT_COMMIT_SHORT}"
                    env.FULL_IMAGE_TAG = "${IMAGE_NAME}:${env.VERSION_TAG}"
                    env.LATEST_IMAGE_TAG = "${IMAGE_NAME}:latest"
                    
                    echo "Version Tag: ${env.VERSION_TAG}"
                    echo "Full Image Tag: ${env.FULL_IMAGE_TAG}"
                    echo "Latest Image Tag: ${env.LATEST_IMAGE_TAG}"
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                container('docker') {
                    script {
                        echo "Building Docker image in Kubernetes Pod..."
                        
                        // Docker 버전 및 연결 확인
                        sh "docker --version"
                        sh "docker info"
                        
                        // Docker 이미지 빌드
                        sh """
                            echo "Building Docker image: ${env.FULL_IMAGE_TAG}"
                            docker build -t ${env.FULL_IMAGE_TAG} --file Dockerfile .
                            docker tag ${env.FULL_IMAGE_TAG} ${env.LATEST_IMAGE_TAG}
                        """
                        
                        // 빌드된 이미지 확인
                        sh "docker images | grep '${HARBOR_PROJECT}/${HARBOR_REPO}' || true"
                        
                        echo "✅ Docker image built successfully: ${env.FULL_IMAGE_TAG}"
                    }
                }
            }
        }
        
        stage('Test Harbor Credential') {
            steps {
                container('docker') {
                    script {
                        echo "Testing Harbor internal service connectivity..."
                        
                        // DNS 해결 확인만 수행
                        sh """
                            echo "=== Harbor Internal Service DNS Check ==="
                            echo "Harbor Core Service: ${HARBOR_REGISTRY}"
                            nslookup ${HARBOR_REGISTRY} || echo "Harbor Core DNS resolution failed"
                            
                            echo "Harbor Registry Service: harbor-registry.harbor.svc.cluster.local"
                            nslookup harbor-registry.harbor.svc.cluster.local || echo "Harbor Registry DNS resolution failed"
                        """
                        
                        // Harbor credential으로 직접 Docker login 테스트
                        withCredentials([usernamePassword(credentialsId: HARBOR_CREDENTIAL_ID, passwordVariable: 'HARBOR_PASSWORD', usernameVariable: 'HARBOR_USERNAME')]) {
                            sh """
                                echo "=== Testing Docker login to Harbor Registry ==="
                                echo "Harbor Username: \$HARBOR_USERNAME"
                                echo "Harbor Password length: \${#HARBOR_PASSWORD}"
                                
                                echo "Attempting Docker login to Harbor Registry..."
                                echo "\$HARBOR_PASSWORD" | docker login harbor-registry.harbor.svc.cluster.local:5000 -u "\$HARBOR_USERNAME" --password-stdin || echo "Docker login failed"
                            """
                        }
                    }
                }
            }
        }
        
        stage('Docker Push to Harbor') {
            steps {
                container('docker') {
                    script {
                        echo "Pushing Docker image to Harbor internal registry..."
                        
                        // Harbor Registry 내부 서비스 주소 (포트 5000)
                        def harborRegistryService = "harbor-registry.harbor.svc.cluster.local:5000"
                        
                        // 내부 서비스용 이미지 태그 생성
                        def internalFullImageTag = "${harborRegistryService}/${HARBOR_PROJECT}/${HARBOR_REPO}:${env.VERSION_TAG}"
                        def internalLatestImageTag = "${harborRegistryService}/${HARBOR_PROJECT}/${HARBOR_REPO}:latest"
                        
                        // 기존 이미지를 내부 서비스 주소로 다시 태그
                        sh """
                            echo "Re-tagging images for Harbor internal registry..."
                            docker tag ${env.FULL_IMAGE_TAG} ${internalFullImageTag}
                            docker tag ${env.LATEST_IMAGE_TAG} ${internalLatestImageTag}
                            
                            echo "Images tagged for internal registry:"
                            echo "  - ${internalFullImageTag}"
                            echo "  - ${internalLatestImageTag}"
                        """
                        
                        // Harbor 레지스트리 로그인
                        withCredentials([usernamePassword(credentialsId: HARBOR_CREDENTIAL_ID, passwordVariable: 'HARBOR_PASSWORD', usernameVariable: 'HARBOR_USERNAME')]) {
                            sh """
                                echo "Logging into Harbor internal registry: ${harborRegistryService}"
                                echo "\$HARBOR_PASSWORD" | docker login ${harborRegistryService} -u "\$HARBOR_USERNAME" --password-stdin
                            """
                        }
                        
                        // 이미지 푸시
                        sh """
                            echo "Pushing images to Harbor internal registry..."
                            docker push ${internalFullImageTag}
                            docker push ${internalLatestImageTag}
                        """
                        
                        // 환경변수 업데이트 (post 단계에서 사용)
                        env.FINAL_FULL_IMAGE_TAG = internalFullImageTag
                        env.FINAL_LATEST_IMAGE_TAG = internalLatestImageTag
                        
                        echo "✅ Docker images pushed successfully to Harbor internal registry!"
                        echo "  - ${internalFullImageTag}"
                        echo "  - ${internalLatestImageTag}"
                    }
                }
            }
        }
        
        stage('Clean Up') {
            steps {
                container('docker') {
                    script {
                        echo "Cleaning up local Docker images..."
                        
                        // 로컬 Docker 이미지 정리 (모든 태그 포함)
                        sh """
                            docker rmi ${env.FULL_IMAGE_TAG} || true
                            docker rmi ${env.LATEST_IMAGE_TAG} || true
                            docker rmi ${env.FINAL_FULL_IMAGE_TAG} || true
                            docker rmi ${env.FINAL_LATEST_IMAGE_TAG} || true
                            docker system prune -f || true
                        """
                        
                        echo "✅ Clean up completed."
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "Pipeline execution completed."
                echo "Image Tags Created:"
                echo "  - ${env.FULL_IMAGE_TAG}"
                echo "  - ${env.LATEST_IMAGE_TAG}"
            }
        }
        
        success {
            script {
                echo "✅ Pipeline succeeded!"
                echo "Docker images have been successfully pushed to Harbor internal registry:"
                echo "  Registry: harbor-registry.harbor.svc.cluster.local:5000"
                echo "  Project: ${HARBOR_PROJECT}"
                echo "  Repository: ${HARBOR_REPO}"
                echo "  Version Tag: ${env.VERSION_TAG}"
                echo "  Final Images:"
                echo "    - ${env.FINAL_FULL_IMAGE_TAG ?: env.FULL_IMAGE_TAG}"
                echo "    - ${env.FINAL_LATEST_IMAGE_TAG ?: env.LATEST_IMAGE_TAG}"
            }
        }
        
        failure {
            script {
                echo "❌ Pipeline failed!"
                echo "Please check the build logs for error details."
            }
        }
        
        cleanup {
            script {
                // 추가 정리 작업이 필요한 경우
                echo "Performing final cleanup..."
            }
        }
    }
}
