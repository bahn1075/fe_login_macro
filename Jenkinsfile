pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: docker
    image: docker:dind
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
  - name: docker-cli
    image: docker:cli
    command:
    - cat
    tty: true
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2375
"""
        }
    }
    
    environment {
        IMAGE_NAME = "fe-login-macro"
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
                container('docker-cli') {
                    sh """
                        # Docker 데몬 준비 대기
                        until docker info >/dev/null 2>&1; do
                            echo "Waiting for Docker daemon..."
                            sleep 2
                        done
                        
                        # 이미지 빌드
                        docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                        docker build -t ${IMAGE_NAME}:latest .
                        
                        # Harbor용 태그 생성
                        docker tag ${IMAGE_NAME}:${IMAGE_TAG} harbor-core.harbor.svc.cluster.local/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}
                        docker tag ${IMAGE_NAME}:latest harbor-core.harbor.svc.cluster.local/${HARBOR_PROJECT}/${IMAGE_NAME}:latest
                        
                        # 빌드 확인
                        docker images ${IMAGE_NAME}
                    """
                }
            }
        }
        
        stage('Push to Harbor') {
            steps {
                container('docker-cli') {
                    withCredentials([usernamePassword(
                        credentialsId: "${HARBOR_CREDENTIAL_ID}",
                        passwordVariable: 'HARBOR_PASSWORD',
                        usernameVariable: 'HARBOR_USERNAME'
                    )]) {
                        sh """
                            # Harbor에 로그인
                            echo "Logging in to Harbor..."
                            echo "\$HARBOR_PASSWORD" | docker login harbor-core.harbor.svc.cluster.local -u "\$HARBOR_USERNAME" --password-stdin
                            
                            # 이미지 푸시
                            echo "Pushing images to Harbor..."
                            docker push harbor-core.harbor.svc.cluster.local/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}
                            docker push harbor-core.harbor.svc.cluster.local/${HARBOR_PROJECT}/${IMAGE_NAME}:latest
                            
                            echo "✅ Images pushed successfully!"
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