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
    
    // MongoDB URI 형식 검증
    if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017/todo') {
      console.error('⚠️ 경고: 기본 로컬 MongoDB URI를 사용하고 있습니다.');
      console.error('Heroku에서는 반드시 환경변수 MONGO_URI를 설정해야 합니다.');
    }
    
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('✅ MongoDB 연결 성공');
    console.log('연결된 데이터베이스:', mongoose.connection.name);
    return true;
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:');
    console.error('에러 타입:', error.name);
    console.error('에러 코드:', error.code || '없음');
    console.error('에러 메시지:', error.message);
    
    // IP 화이트리스트 문제 체크 (가장 흔한 Heroku 문제)
    if (error.name === 'MongooseServerSelectionError' || 
        error.name === 'MongoServerSelectionError' ||
        (error.message && (error.message.includes('whitelist') || error.message.includes('whitelisted')))) {
      console.error('');
      console.error('🚨 IP 화이트리스트 문제입니다!');
      console.error('');
      console.error('⚠️ 중요: MongoDB Atlas에서 설정이 완료되었다면 몇 분 기다려주세요.');
      console.error('   설정 반영까지 1-2분 정도 소요될 수 있습니다.');
      console.error('');
      console.error('MongoDB Atlas 설정 확인 방법:');
      console.error('1. https://cloud.mongodb.com 접속 후 로그인');
      console.error('2. 프로젝트 선택 → 왼쪽 메뉴 "Network Access" 클릭');
      console.error('3. IP 목록에 "0.0.0.0/0" 또는 "Allow Access from Anywhere"가 있는지 확인');
      console.error('4. 없다면 "Add IP Address" 클릭 → "Allow Access from Anywhere" 선택 → "Confirm"');
      console.error('');
      console.error('현재 설정된 MongoDB URI 형식:', MONGODB_URI.substring(0, 30) + '...');
      console.error('연결하려는 클러스터:', MONGODB_URI.match(/@([^/]+)/)?.[1] || '확인 불가');
      return false;
    }
    
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
      console.error('해결방법: MongoDB Atlas의 Network Access에서 IP를 허용해주세요.');
    } else if (error.message && error.message.includes('authentication')) {
      console.error('원인: 인증 실패');
      console.error('해결방법: MongoDB Atlas의 사용자 이름과 비밀번호를 확인해주세요.');
    } else {
      console.error('원인: 알 수 없는 연결 오류');
      console.error('전체 에러 정보:', error);
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

