import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

import studentsReducer from './studentsSlice';
import teachersReducer from './teachersSlice';
import scheduleReducer from './scheduleSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['students', 'teachers', 'schedule'] // 需要持久化的数据
};

const rootReducer = combineReducers({
  students: studentsReducer,
  teachers: teachersReducer,
  schedule: scheduleReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER'],
      },
    }),
});

export const persistor = persistStore(store);