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
                    
                    // 브랜치명 가져오기
                    env.GIT_BRANCH_NAME = env.BRANCH_NAME ?: sh(
                        script: "git symbolic-ref --short HEAD",
                        returnStdout: true
                    ).trim()
                    
                    // 브랜치명 정리 (Docker 태그 규칙 준수)
                    env.CLEAN_BRANCH_NAME = env.GIT_BRANCH_NAME.replaceAll(/[^a-zA-Z0-9._-]/, '-').toLowerCase()
                    
                    // SemVer + Branch + Commit ID 태그 생성
                    env.IMAGE_TAG = "${MAJOR_VERSION}.${MINOR_VERSION}.${env.BUILD_NUMBER}-${env.CLEAN_BRANCH_NAME}-${env.GIT_COMMIT_SHORT}"
                    
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
                        
                        # 빌드 확인
                        docker images ${IMAGE_NAME}
                    """
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