import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: []
};

// 定义学生数据的初始结构
const createStudentData = (data) => ({
  id: Date.now(),
  name: '',           // 姓名
  gender: '',         // 性别
  age: undefined,     // 年龄
  dailyClasses: 0,    // 每天上课次数
  classDuration: 0,   // 上课时长（分钟）
  ...data
});

export const studentsSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    addStudent: (state, action) => {
      state.list.push(createStudentData(action.payload));
    },
    updateStudent: (state, action) => {
      const index = state.list.findIndex(student => student.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = {
          ...state.list[index],
          ...action.payload
        };
      }
    },
    deleteStudent: (state, action) => {
      state.list = state.list.filter(student => student.id !== action.payload);
    }
  }
});

export const { addStudent, updateStudent, deleteStudent } = studentsSlice.actions;
export default studentsSlice.reducer;