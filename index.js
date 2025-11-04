// 환경변수 로드
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const todoRoutes = require('./routes/todos');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/todo';

// 환경변수 로드 확인 (디버깅용)
console.log('환경변수 확인:');
console.log('MONGO_URI:', process.env.MONGO_URI ? '로드됨' : '로드되지 않음');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '로드됨' : '로드되지 않음');
console.log('사용할 MongoDB URI:', MONGODB_URI.substring(0, 30) + '...');

// Express 앱 생성
const app = express();

// 미들웨어
app.use(cors()); // CORS 설정 (모든 도메인 허용)
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 요청 본문 파싱

// MongoDB 연결 옵션
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // 5초 타임아웃
  socketTimeoutMS: 45000,
};

// MongoDB 연결 함수
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('MongoDB 연결 성공');
    return true;
  } catch (error) {
    console.error('MongoDB 연결 실패:');
    console.error('에러 코드:', error.code);
    console.error('에러 메시지:', error.message);
    
    // 주요 에러 원인 분석
    if (error.code === 'ECONNREFUSED') {
      console.error('원인: MongoDB 서버가 실행 중이 아닙니다.');
      console.error('해결방법: MongoDB 서비스를 시작해주세요.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('원인: MongoDB 호스트를 찾을 수 없습니다.');
      console.error('해결방법: MONGODB_URI 환경변수를 확인해주세요.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('원인: MongoDB 연결 시간 초과');
      console.error('해결방법: MongoDB 서버가 실행 중인지 확인해주세요.');
    } else if (error.code === 'MongoNetworkError') {
      console.error('원인: 네트워크 연결 문제');
      console.error('해결방법: MongoDB 서버 상태와 네트워크를 확인해주세요.');
    }
    
    return false;
  }
}

// 라우트 설정
app.use('/api/todos', todoRoutes);

// 루트 경로
app.get('/', (req, res) => {
  res.json({ message: 'TODO Backend Server is running!' });
});

// 서버 시작 함수
async function startServer() {
  // MongoDB 연결 시도
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.error('MongoDB 연결에 실패하여 서버를 시작할 수 없습니다.');
    process.exit(1);
  }
  
  // 서버 시작
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('서버 시작 실패:');
    console.error('에러 코드:', error.code);
    console.error('에러 메시지:', error.message);
    
    if (error.code === 'EADDRINUSE') {
      console.error('원인: 포트가 이미 사용 중입니다.');
      console.error(`해결방법: 포트 ${PORT}를 사용하는 프로세스를 종료하거나 다른 포트를 사용하세요.`);
    }
    process.exit(1);
  }
}

// 서버 시작
startServer();

