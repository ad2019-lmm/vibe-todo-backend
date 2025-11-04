// 환경변수 로드
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const todoRoutes = require('./routes/todos');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/todo';

// 환경변수 로드 확인 (디버깅용)
console.log('환경변수 확인:');
console.log('MONGO_URI:', process.env.MONGO_URI ? '로드됨' : '로드되지 않음');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '로드됨' : '로드되지 않음');
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  console.error('⚠️ 경고: MONGO_URI 환경변수가 설정되지 않았습니다!');
  console.error('Heroku에서 설정하려면: heroku config:set MONGO_URI=your_mongodb_uri');
}
console.log('사용할 MongoDB URI:', MONGODB_URI.substring(0, 50) + '...');

// Express 앱 생성
const app = express();

// 미들웨어
app.use(cors()); // CORS 설정 (모든 도메인 허용)
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 요청 본문 파싱

// MongoDB 연결 옵션
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // 30초 타임아웃 (Heroku는 느릴 수 있음)
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
};

// MongoDB 연결 함수
async function connectDB() {
  try {
    console.log('MongoDB 연결 시도 중...');
    console.log('연결 URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // 비밀번호 숨김
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('✅ MongoDB 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:');
    console.error('에러 코드:', error.code);
    console.error('에러 메시지:', error.message);
    console.error('전체 에러:', error);
    
    // 주요 에러 원인 분석
    if (error.code === 'ECONNREFUSED') {
      console.error('원인: MongoDB 서버가 실행 중이 아닙니다.');
      console.error('해결방법: MongoDB 서비스를 시작해주세요.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('원인: MongoDB 호스트를 찾을 수 없습니다.');
      console.error('해결방법: MONGO_URI 환경변수를 확인해주세요.');
      console.error('Heroku에서 설정: heroku config:set MONGO_URI=your_mongodb_uri');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ETIMEOUT') {
      console.error('원인: MongoDB 연결 시간 초과');
      console.error('해결방법: MongoDB Atlas의 Network Access에서 Heroku IP를 허용했는지 확인해주세요.');
      console.error('또는 MongoDB Atlas에서 "Allow Access from Anywhere" (0.0.0.0/0)를 설정해주세요.');
    } else if (error.name === 'MongoServerSelectionError' || error.code === 'MongoNetworkError') {
      console.error('원인: 네트워크 연결 문제 또는 IP 화이트리스트 문제');
      console.error('해결방법:');
      console.error('1. MongoDB Atlas의 Network Access에서 IP 주소를 허용해주세요.');
      console.error('2. MongoDB Atlas에서 "Allow Access from Anywhere" (0.0.0.0/0)를 설정할 수 있습니다.');
      console.error('3. MongoDB Atlas의 데이터베이스 사용자 비밀번호가 올바른지 확인해주세요.');
    } else if (error.message && error.message.includes('authentication')) {
      console.error('원인: 인증 실패');
      console.error('해결방법: MongoDB Atlas의 사용자 이름과 비밀번호를 확인해주세요.');
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

