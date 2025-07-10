# 멀티 스테이지 빌드 - Build Stage
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (빌드 시 devDependencies 필요)
RUN npm ci

# public 폴더 명시적 복사
COPY public/ ./public/

# src 폴더 복사
COPY src/ ./src/

# 기타 필요한 파일들 복사
COPY tsconfig.json ./

# 복사된 파일 확인 (디버깅)
RUN echo "=== Debugging: Checking copied files ===" && \
    ls -la /app && \
    echo "=== Checking public directory ===" && \
    ls -la /app/public/ && \
    echo "=== Checking if index.html exists ===" && \
    test -f /app/public/index.html && echo "index.html exists" || echo "index.html NOT found"

# 프로덕션 빌드 생성
RUN npm run build

# 프로덕션 스테이지 - Production Stage
FROM nginx:alpine

# 빌드된 파일을 nginx에 복사
COPY --from=builder /app/build /usr/share/nginx/html

# nginx 설정 파일 복사 (SPA 라우팅 지원)
COPY nginx.conf /etc/nginx/nginx.conf

# 80 포트 노출
EXPOSE 80

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]
