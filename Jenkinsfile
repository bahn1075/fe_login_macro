pipeline {
    agent any
    
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
                                # 현재 브랜치 확인 (여러 방법 시도)
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
                    echo "Jenkins BRANCH_NAME: ${env.BRANCH_NAME ?: 'not set'}"
                    echo "Jenkins GIT_BRANCH: ${env.GIT_BRANCH ?: 'not set'}"
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
                script {
                    echo "Building Docker image..."
                    
                    // Docker 이미지 빌드
                    def dockerImage = docker.build(
                        env.FULL_IMAGE_TAG,
                        "--file Dockerfile ."
                    )
                    
                    // latest 태그도 추가
                    sh "docker tag ${env.FULL_IMAGE_TAG} ${env.LATEST_IMAGE_TAG}"
                    
                    echo "Docker image built successfully: ${env.FULL_IMAGE_TAG}"
                }
            }
        }
        
        stage('Docker Push to Harbor') {
            steps {
                script {
                    echo "Pushing Docker image to Harbor registry..."
                    
                    // Harbor 레지스트리에 로그인 및 푸시
                    docker.withRegistry("https://${HARBOR_REGISTRY}", HARBOR_CREDENTIAL_ID) {
                        // 버전 태그 푸시
                        sh "docker push ${env.FULL_IMAGE_TAG}"
                        echo "Pushed: ${env.FULL_IMAGE_TAG}"
                        
                        // latest 태그 푸시
                        sh "docker push ${env.LATEST_IMAGE_TAG}"
                        echo "Pushed: ${env.LATEST_IMAGE_TAG}"
                    }
                    
                    echo "Docker images pushed successfully to Harbor!"
                }
            }
        }
        
        stage('Clean Up') {
            steps {
                script {
                    echo "Cleaning up local Docker images..."
                    
                    // 로컬 Docker 이미지 정리
                    sh """
                        docker rmi ${env.FULL_IMAGE_TAG} || true
                        docker rmi ${env.LATEST_IMAGE_TAG} || true
                        docker system prune -f || true
                    """
                    
                    echo "Clean up completed."
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
