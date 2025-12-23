import axios, { AxiosError } from 'axios';

// Error response interface
export interface ApiError {
    success: false;
    message: string;
    error?: string;
    statusCode?: number;
}

// Success response interface
export interface ApiResponse<T> {
    success: true;
    data: T;
    message?: string;
    count?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper to extract error message from API response
export const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;

        // Check for structured error response
        if (axiosError.response?.data?.message) {
            return axiosError.response.data.message;
        }

        // Check for error field
        if (axiosError.response?.data?.error) {
            return axiosError.response.data.error;
        }

        // Fallback to status text
        if (axiosError.response?.statusText) {
            return axiosError.response.statusText;
        }

        // Network error
        if (axiosError.code === 'ERR_NETWORK') {
            return 'Network error. Please check your connection.';
        }

        return axiosError.message || 'An unexpected error occurred';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'An unexpected error occurred';
};

// Create axios instance with interceptors
export const apiInstance = axios.create({
    baseURL: API_URL,
    timeout: 80000, // 80 second timeout
});

// Response interceptor for error handling
apiInstance.interceptors.response.use(
    (response) => {
        // Return data directly for successful responses
        return response;
    },
    (error: AxiosError<ApiError>) => {
        // Log error for debugging
        console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: getErrorMessage(error),
        });

        // Re-throw the error for handling in components/thunks
        return Promise.reject(error);
    }
);
