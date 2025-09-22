import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: []
};

export const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    addSchedule: (state, action) => {
      state.list.push({
        id: Date.now(),
        ...action.payload
      });
    },
    updateSchedule: (state, action) => {
      const index = state.list.findIndex(schedule => schedule.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    },
    deleteSchedule: (state, action) => {
      state.list = state.list.filter(schedule => schedule.id !== action.payload);
    }
  }
});

export const { addSchedule, updateSchedule, deleteSchedule } = scheduleSlice.actions;
export default scheduleSlice.reducer;