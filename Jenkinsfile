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
        // Harbor 설정
        HARBOR_REGISTRY = "${env.HARBOR_URL ?: 'harbor.local'}"
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
                        echo "Testing Harbor credential and connectivity..."
                        
                        // 필수 도구 설치
                        sh """
                            echo "=== Installing required tools ==="
                            apk add --no-cache curl
                        """
                        
                        // Harbor 연결 테스트
                        sh """
                            echo "=== Testing Harbor connectivity ==="
                            echo "Testing HTTPS connection..."
                            curl -k -I https://${HARBOR_REGISTRY}/api/v2.0/systeminfo || echo "Harbor HTTPS connection failed"
                            
                            echo "Testing HTTP connection..."
                            curl -k -I http://${HARBOR_REGISTRY}/api/v2.0/systeminfo || echo "Harbor HTTP connection failed"
                            
                            echo "Testing basic connectivity..."
                            curl -k -v https://${HARBOR_REGISTRY} || echo "Basic HTTPS connection failed"
                        """
                        
                        // Harbor credential 테스트
                        withCredentials([usernamePassword(credentialsId: HARBOR_CREDENTIAL_ID, passwordVariable: 'HARBOR_PASSWORD', usernameVariable: 'HARBOR_USERNAME')]) {
                            sh """
                                echo "=== Testing Harbor credential ==="
                                echo "Harbor Registry: ${HARBOR_REGISTRY}"
                                echo "Harbor Username: \$HARBOR_USERNAME"
                                echo "Harbor Password length: \${#HARBOR_PASSWORD}"
                                
                                echo "=== Testing Docker login with detailed output ==="
                                echo "\$HARBOR_PASSWORD" | docker login ${HARBOR_REGISTRY} -u "\$HARBOR_USERNAME" --password-stdin 2>&1 || echo "Docker login failed"
                                
                                echo "=== Testing Harbor API access ==="
                                curl -k -u "\$HARBOR_USERNAME:\$HARBOR_PASSWORD" https://${HARBOR_REGISTRY}/api/v2.0/projects 2>&1 || echo "Harbor API access failed"
                                
                                echo "=== Testing Harbor v1 API ==="
                                curl -k -u "\$HARBOR_USERNAME:\$HARBOR_PASSWORD" https://${HARBOR_REGISTRY}/api/repositories 2>&1 || echo "Harbor v1 API access failed"
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
                        echo "Pushing Docker image to Harbor registry..."
                        
                        // Harbor 레지스트리 로그인
                        withCredentials([usernamePassword(credentialsId: HARBOR_CREDENTIAL_ID, passwordVariable: 'HARBOR_PASSWORD', usernameVariable: 'HARBOR_USERNAME')]) {
                            sh """
                                echo "Logging into Harbor registry: ${HARBOR_REGISTRY}"
                                echo "\$HARBOR_PASSWORD" | docker login ${HARBOR_REGISTRY} -u "\$HARBOR_USERNAME" --password-stdin
                            """
                        }
                        
                        // 이미지 푸시
                        sh """
                            echo "Pushing images to Harbor..."
                            docker push ${env.FULL_IMAGE_TAG}
                            docker push ${env.LATEST_IMAGE_TAG}
                        """
                        
                        echo "✅ Docker images pushed successfully to Harbor!"
                        echo "  - ${env.FULL_IMAGE_TAG}"
                        echo "  - ${env.LATEST_IMAGE_TAG}"
                    }
                }
            }
        }
        
        stage('Clean Up') {
            steps {
                container('docker') {
                    script {
                        echo "Cleaning up local Docker images..."
                        
                        // 로컬 Docker 이미지 정리
                        sh """
                            docker rmi ${env.FULL_IMAGE_TAG} || true
                            docker rmi ${env.LATEST_IMAGE_TAG} || true
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
                echo "Docker images have been successfully pushed to Harbor:"
                echo "  Registry: ${HARBOR_REGISTRY}"
                echo "  Project: ${HARBOR_PROJECT}"
                echo "  Repository: ${HARBOR_REPO}"
                echo "  Version Tag: ${env.VERSION_TAG}"
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
