# 멀티 스테이지 빌드 - Build Stage
FROM node:20-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# npm을 최신 버전으로 업데이트하고 설정
RUN npm install -g npm@latest && \
    npm config set fund false && \
    npm config set audit false && \
    npm config set update-notifier false && \
    npm config set progress false && \
    npm config set loglevel error

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (빌드 시 devDependencies 필요)
# silent 모드로 경고 최소화
RUN npm ci --silent --no-audit --no-fund

# 소스 코드 전체 복사
COPY . .

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
