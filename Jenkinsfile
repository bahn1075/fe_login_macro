pipeline {
    agent {
        kubernetes {
            namespace 'jenkins'
            yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins: worker
spec:
  containers:
  - name: docker
    image: docker:24-dind  # DinD 이미지로 변경
    command:
    - dockerd
    - --host=tcp://0.0.0.0:2375
    - --host=unix:///var/run/docker.sock
    - --storage-driver=overlay2
    - --tls=false
    - --insecure-registry=harbor-core.harbor.svc.cluster.local
    - --insecure-registry=harbor-core.harbor.svc.cluster.local:80
    - --insecure-registry=harbor-core.harbor.svc.cluster.local:443
    - --insecure-registry=harbor-registry.harbor.svc.cluster.local:5000
    - --insecure-registry=10.110.228.152
    - --insecure-registry=10.110.228.152:80
    - --insecure-registry=10.110.228.152:443
    - --insecure-registry=10.106.49.41:5000
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    securityContext:
      privileged: true
    volumeMounts:
    - name: docker-storage
      mountPath: /var/lib/docker
    resources:
      requests:
        memory: "512Mi"
        cpu: "200m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
  - name: docker-cli
    image: docker:24-cli
    command:
    - cat
    tty: true
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2375
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
  - name: docker-storage
    emptyDir: {}
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
        stage('Setup Docker') {
            steps {
                container('docker-cli') {
                    script {
                        // Docker 데몬이 준비될 때까지 대기
                        sh """
                            echo "Waiting for Docker daemon to be ready..."
                            until docker info >/dev/null 2>&1; do
                                echo "Waiting for Docker daemon..."
                                sleep 2
                            done
                            echo "Docker daemon is ready!"
                            
                            # DNS 해결을 위한 hosts 파일 설정
                            echo "Setting up hosts entries for Harbor..."
                            
                            # Harbor 서비스의 실제 IP 주소 가져오기
                            HARBOR_CORE_IP=\$(getent hosts harbor-core.harbor.svc.cluster.local | awk '{ print \$1 }')
                            HARBOR_REGISTRY_IP=\$(getent hosts harbor-registry.harbor.svc.cluster.local | awk '{ print \$1 }')
                            
                            echo "Harbor Core IP: \$HARBOR_CORE_IP"
                            echo "Harbor Registry IP: \$HARBOR_REGISTRY_IP"
                            
                            # hosts 파일에 추가 (컨테이너 내부)
                            echo "\$HARBOR_CORE_IP harbor-core.harbor.svc.cluster.local" >> /etc/hosts
                            echo "\$HARBOR_REGISTRY_IP harbor-registry.harbor.svc.cluster.local" >> /etc/hosts
                            echo "\$HARBOR_CORE_IP harbor.local" >> /etc/hosts
                            
                            # Docker 클라이언트 설정 파일 생성
                            mkdir -p ~/.docker
                            cat > ~/.docker/config.json <<EOF
{
    "auths": {},
    "HttpHeaders": {
        "User-Agent": "Docker-Client/24.0.0"
    },
    "insecure-registries": [
        "harbor-core.harbor.svc.cluster.local",
        "harbor-core.harbor.svc.cluster.local:80",
        "harbor-core.harbor.svc.cluster.local:443",
        "harbor-registry.harbor.svc.cluster.local:5000",
        "\$HARBOR_CORE_IP",
        "\$HARBOR_CORE_IP:80",
        "\$HARBOR_CORE_IP:443",
        "\$HARBOR_REGISTRY_IP:5000"
    ]
}
EOF
                            
                            echo "Docker setup completed!"
                        """
                    }
                }
            }
        }
        
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
                container('docker-cli') {
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
        
        stage('Test Harbor Connectivity') {
            steps {
                container('docker-cli') {
                    script {
                        echo "Testing Harbor connectivity..."
                        
                        // DNS 및 네트워크 연결 테스트
                        sh """
                            echo "=== Network Connectivity Test ==="
                            
                            # DNS 해결 테스트
                            echo "Testing DNS resolution..."
                            getent hosts ${HARBOR_REGISTRY} || echo "Core DNS resolution failed"
                            getent hosts harbor-registry.harbor.svc.cluster.local || echo "Registry DNS resolution failed"
                            
                            # hosts 파일 확인
                            echo -e "\n/etc/hosts entries:"
                            cat /etc/hosts | grep harbor || echo "No harbor entries in hosts file"
                            
                            # 포트 연결 테스트
                            echo -e "\nTesting port connectivity..."
                            nc -zv ${HARBOR_REGISTRY} 80 || echo "Harbor Core port 80 not reachable"
                            nc -zv ${HARBOR_REGISTRY} 443 || echo "Harbor Core port 443 not reachable"
                            nc -zv harbor-registry.harbor.svc.cluster.local 5000 || echo "Harbor Registry port 5000 not reachable"
                            
                            # Harbor API 테스트
                            echo -e "\nTesting Harbor API endpoints..."
                            # HTTP로 시도
                            curl -v -k http://${HARBOR_REGISTRY}/api/v2.0/systeminfo || echo "HTTP API test failed"
                            
                            # HTTPS로 시도
                            curl -v -k https://${HARBOR_REGISTRY}/api/v2.0/systeminfo || echo "HTTPS API test failed"
                        """
                    }
                }
            }
        }
        
        stage('Docker Push to Harbor') {
            steps {
                container('docker-cli') {
                    script {
                        echo "Pushing Docker image to Harbor..."
                        
                        // Harbor 레지스트리 로그인 및 푸시
                        withCredentials([usernamePassword(credentialsId: HARBOR_CREDENTIAL_ID, passwordVariable: 'HARBOR_PASSWORD', usernameVariable: 'HARBOR_USERNAME')]) {
                            sh """
                                echo "=== Attempting Harbor Login ==="
                                
                                # HTTP와 HTTPS 모두 시도
                                echo "Trying different Harbor endpoints..."
                                
                                # 1. HTTP로 Harbor Core 로그인 시도
                                echo -e "\n1. Trying HTTP protocol on Harbor Core..."
                                echo "\$HARBOR_PASSWORD" | docker login http://${HARBOR_REGISTRY} -u "\$HARBOR_USERNAME" --password-stdin || {
                                    echo "HTTP login failed, trying without protocol..."
                                }
                                
                                # 2. 프로토콜 없이 시도 (Docker가 자동으로 HTTPS 시도)
                                echo -e "\n2. Trying without protocol specification..."
                                echo "\$HARBOR_PASSWORD" | docker login ${HARBOR_REGISTRY} -u "\$HARBOR_USERNAME" --password-stdin || {
                                    echo "Default login failed, trying port 80..."
                                }
                                
                                # 3. 포트 80 명시적 지정
                                echo -e "\n3. Trying with port 80..."
                                echo "\$HARBOR_PASSWORD" | docker login ${HARBOR_REGISTRY}:80 -u "\$HARBOR_USERNAME" --password-stdin || {
                                    echo "Port 80 login failed, trying registry service..."
                                }
                                
                                # 4. Harbor Registry 서비스 직접 사용
                                echo -e "\n4. Trying Harbor Registry service directly..."
                                echo "\$HARBOR_PASSWORD" | docker login harbor-registry.harbor.svc.cluster.local:5000 -u "\$HARBOR_USERNAME" --password-stdin || {
                                    echo "Registry service login failed"
                                }
                                
                                # 로그인 성공 여부 확인
                                if docker info | grep -q "Registry"; then
                                    echo -e "\n✅ Docker login successful!"
                                    
                                    # 이미지 푸시
                                    echo -e "\nPushing images to Harbor..."
                                    docker push ${env.FULL_IMAGE_TAG} || {
                                        echo "Push to main registry failed, trying alternatives..."
                                        
                                        # 대체 레지스트리로 태그 및 푸시
                                        FALLBACK_TAG="${HARBOR_REGISTRY}:80/${HARBOR_PROJECT}/${HARBOR_REPO}:${env.VERSION_TAG}"
                                        docker tag ${env.FULL_IMAGE_TAG} \$FALLBACK_TAG
                                        docker push \$FALLBACK_TAG
                                    }
                                    
                                    docker push ${env.LATEST_IMAGE_TAG} || {
                                        echo "Latest tag push failed"
                                    }
                                    
                                    echo "✅ Docker images pushed successfully!"
                                else
                                    echo "❌ All login attempts failed!"
                                    exit 1
                                fi
                            """
                        }
                    }
                }
            }
        }
        
        stage('Clean Up') {
            steps {
                container('docker-cli') {
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
    }
}