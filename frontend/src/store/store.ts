import { configureStore } from '@reduxjs/toolkit';
import projectReducer from './slices/projectSlice';
import webcontainerReducer from './slices/webcontainerSlice';

export const store = configureStore({
    reducer: {
        project: projectReducer,
        webcontainer: webcontainerReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
