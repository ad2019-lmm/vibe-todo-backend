const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');

// 모든 할일 조회 라우터 (GET /api/todos)
router.get('/', async (req, res) => {
  try {
    // 쿼리 파라미터로 필터링 옵션 지원 (completed)
    const { completed } = req.query;
    
    let query = {};
    
    // completed 필터가 있으면 적용
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    // 모든 할일 조회 (최신순 정렬)
    const todos = await Todo.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: todos.length,
      data: todos
    });

  } catch (error) {
    console.error('할일 조회 에러:', error);

    res.status(500).json({
      success: false,
      message: '서버 에러가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 할일 조회 라우터 (GET /api/todos/:id)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // MongoDB ObjectId 형식 검증
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 할일 ID입니다.'
      });
    }

    const todo = await Todo.findById(id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '할일을 찾을 수 없습니다.'
      });
    }

    res.status(200).json({
      success: true,
      data: todo
    });

  } catch (error) {
    console.error('할일 조회 에러:', error);

    res.status(500).json({
      success: false,
      message: '서버 에러가 발생했습니다.',
      error: error.message
    });
  }
});

// 할일 생성 라우터 (POST /api/todos)
router.post('/', async (req, res) => {
  try {
    const { title, description, completed, dueDate } = req.body;

    // 제목 필수 검증
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '할일 제목은 필수입니다.'
      });
    }

    // 할일 생성
    const todo = new Todo({
      title: title.trim(),
      description: description ? description.trim() : '',
      completed: completed || false,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    // 데이터베이스에 저장
    const savedTodo = await todo.save();

    res.status(201).json({
      success: true,
      message: '할일이 성공적으로 생성되었습니다.',
      data: savedTodo
    });

  } catch (error) {
    console.error('할일 생성 에러:', error);

    // Mongoose 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '유효성 검사 실패',
        errors: messages
      });
    }

    // 기타 에러
    res.status(500).json({
      success: false,
      message: '서버 에러가 발생했습니다.',
      error: error.message
    });
  }
});

// 할일 수정 라우터 (PUT /api/todos/:id)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed, dueDate } = req.body;

    // MongoDB ObjectId 형식 검증
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 할일 ID입니다.'
      });
    }

    // 할일 존재 여부 확인
    const existingTodo = await Todo.findById(id);

    if (!existingTodo) {
      return res.status(404).json({
        success: false,
        message: '할일을 찾을 수 없습니다.'
      });
    }

    // 업데이트할 데이터 구성
    const updateData = {};
    
    if (title !== undefined) {
      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '할일 제목은 필수이며 비어있을 수 없습니다.'
        });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : '';
    }

    if (completed !== undefined) {
      updateData.completed = completed;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    // 할일 업데이트
    const updatedTodo = await Todo.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, // 업데이트된 문서 반환
        runValidators: true // 스키마 유효성 검사 실행
      }
    );

    res.status(200).json({
      success: true,
      message: '할일이 성공적으로 수정되었습니다.',
      data: updatedTodo
    });

  } catch (error) {
    console.error('할일 수정 에러:', error);

    // Mongoose 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '유효성 검사 실패',
        errors: messages
      });
    }

    // 기타 에러
    res.status(500).json({
      success: false,
      message: '서버 에러가 발생했습니다.',
      error: error.message
    });
  }
});

// 할일 삭제 라우터 (DELETE /api/todos/:id)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // MongoDB ObjectId 형식 검증
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 할일 ID입니다.'
      });
    }

    // 할일 존재 여부 확인 및 삭제
    const deletedTodo = await Todo.findByIdAndDelete(id);

    if (!deletedTodo) {
      return res.status(404).json({
        success: false,
        message: '할일을 찾을 수 없습니다.'
      });
    }

    res.status(200).json({
      success: true,
      message: '할일이 성공적으로 삭제되었습니다.',
      data: deletedTodo
    });

  } catch (error) {
    console.error('할일 삭제 에러:', error);

    res.status(500).json({
      success: false,
      message: '서버 에러가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;

