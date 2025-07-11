# 멀티 스테이지 빌드 - Build Stage
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
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
