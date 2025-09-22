import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: []
};

export const teachersSlice = createSlice({
  name: 'teachers',
  initialState,
  reducers: {
    addTeacher: (state, action) => {
      state.list.push({
        id: Date.now(),
        ...action.payload
      });
    },
    updateTeacher: (state, action) => {
      const index = state.list.findIndex(teacher => teacher.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    },
    deleteTeacher: (state, action) => {
      state.list = state.list.filter(teacher => teacher.id !== action.payload);
    }
  }
});

export const { addTeacher, updateTeacher, deleteTeacher } = teachersSlice.actions;
export default teachersSlice.reducer;