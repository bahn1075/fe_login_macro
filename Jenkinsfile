pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  hostAliases:
  - ip: "192.168.49.2"
    hostnames:
    - "harbor.local"
  containers:
  - name: docker
    image: docker:24-cli
    imagePullPolicy: IfNotPresent
    command: ['cat']
    tty: true
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2376
  - name: dind
    image: docker:24-dind
    imagePullPolicy: IfNotPresent
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    - name: DOCKER_BUILDKIT
      value: "1"
    args:
    - --host=tcp://0.0.0.0:2376
    - --insecure-registry=harbor.local
    readinessProbe:
      exec:
        command: ["docker", "info"]
      initialDelaySeconds: 10
      periodSeconds: 3
      timeoutSeconds: 5
      failureThreshold: 10
"""
        }
    }
    
    environment {
        IMAGE_NAME = "fe_login_macro"
        MAJOR_VERSION = "1"
        MINOR_VERSION = "0"
        
        // Harbor 설정
        HARBOR_REGISTRY = "harbor.local"
        HARBOR_PROJECT = "fe_login_macro"
        HARBOR_CREDENTIAL_ID = "harbor_robot"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // Git 정보 수집
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short=8 HEAD",
                        returnStdout: true
                    ).trim()
                    
                    // 브랜치명 가져오기 (Jenkins 환경변수 우선, fallback으로 develop 사용)
                    if (env.BRANCH_NAME) {
                        env.GIT_BRANCH_NAME = env.BRANCH_NAME
                    } else if (env.GIT_BRANCH) {
                        env.GIT_BRANCH_NAME = env.GIT_BRANCH.replaceAll(/^origin\//, '')
                    } else {
                        env.GIT_BRANCH_NAME = "develop"  // 기본값
                    }
                    
                    // 브랜치명 정리 (Docker 태그 규칙 준수)
                    env.CLEAN_BRANCH_NAME = env.GIT_BRANCH_NAME.replaceAll(/[^a-zA-Z0-9._-]/, '-').toLowerCase()
                    
                    // SemVer + Branch + Commit ID 태그 생성
                    env.IMAGE_TAG = "${MAJOR_VERSION}.${MINOR_VERSION}.${env.BUILD_NUMBER}-${env.CLEAN_BRANCH_NAME}-${env.GIT_COMMIT_SHORT}"
                    
                    echo "Git Branch: ${env.GIT_BRANCH_NAME}"
                    echo "Clean Branch: ${env.CLEAN_BRANCH_NAME}"
                    echo "Image Tag: ${env.IMAGE_TAG}"
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                container('docker') {
                    sh """
                        # Docker 데몬 준비 대기
                        until docker info >/dev/null 2>&1; do
                            echo "Waiting for Docker daemon..."
                            sleep 2
                        done
                        
                        # BuildKit 활성화 및 builder 설정
                        export DOCKER_BUILDKIT=1
                        
                        # 기존 builder 제거 (실패해도 계속 진행)
                        docker buildx rm mybuilder || true
                        
                        # docker-container 드라이버로 새 builder 생성
                        docker buildx create --name mybuilder --driver docker-container --use
                        
                        # builder 부트스트랩
                        docker buildx inspect --bootstrap
                        
                        # 캐시 태그 정의
                        CACHE_TAG="${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${IMAGE_NAME}:buildcache"
                        
                        echo "🚀 Building with registry cache using BuildKit..."
                        
                        # BuildKit을 사용한 캐시 활용 빌드
                        docker buildx build \\
                            --cache-from=type=registry,ref=\$CACHE_TAG \\
                            --cache-to=type=registry,ref=\$CACHE_TAG,mode=max \\
                            --tag ${IMAGE_NAME}:${IMAGE_TAG} \\
                            --tag ${IMAGE_NAME}:latest \\
                            --tag ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG} \\
                            --tag ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${IMAGE_NAME}:latest \\
                            --output type=docker \\
                            .
                        
                        # 빌드 확인
                        docker images ${IMAGE_NAME}
                        
                        echo "✅ Build completed with registry cache optimization!"
                    """
                }
            }
        }
        
        stage('Push to Harbor') {
            steps {
                container('docker') {
                    withCredentials([usernamePassword(
                        credentialsId: "${HARBOR_CREDENTIAL_ID}",
                        passwordVariable: 'HARBOR_PASSWORD',
                        usernameVariable: 'HARBOR_USERNAME'
                    )]) {
                        sh """
                            # Harbor에 로그인
                            echo "Logging in to Harbor..."
                            echo "\$HARBOR_PASSWORD" | docker login ${HARBOR_REGISTRY} -u "\$HARBOR_USERNAME" --password-stdin
                            
                            # 이미지 푸시
                            echo "📦 Pushing images to Harbor..."
                            docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}
                            docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${IMAGE_NAME}:latest
                            
                            # 캐시 이미지도 푸시 (이미 BuildKit에 의해 푸시되었지만 확인차)
                            echo "💾 Ensuring build cache is available..."
                            docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${IMAGE_NAME}:buildcache || echo "Cache already pushed or push failed, continuing..."
                            
                            echo "✅ Images and cache pushed successfully!"
                        """
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo "Pipeline completed"
        }
        success {
            echo "✅ Docker build successful!"
        }
        failure {
            echo "❌ Pipeline failed!"
        }
    }
}