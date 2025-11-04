const mongoose = require('mongoose');

// Todo 스키마 정의
const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '할일 제목은 필수입니다.'],
    trim: true,
    maxlength: [200, '할일 제목은 200자 이하여야 합니다.']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, '할일 설명은 1000자 이하여야 합니다.']
  },
  completed: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// updatedAt 자동 업데이트를 위한 미들웨어
todoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Todo 모델 생성 및 export
const Todo = mongoose.model('Todo', todoSchema);

module.exports = Todo;



