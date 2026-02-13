import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface ParseResponse {
  success: boolean;
  match_percentage: number;
  skills: string[];
  contact_info: {
    email: string;
    phone: string;
  };
  stats: {
    raw_text_length: number;
    processed_words: number;
    skills_count: number;
  };
  nlp_techniques_used: string[];
  error?: string;
}

export interface TestResponse {
  status: string;
  message: string;
  backend: string;
  nlp_techniques: string[];
  next_step: string;
}

export const testConnection = async (): Promise<TestResponse> => {
  try {
    const response = await api.get('/test');
    return response.data;
  } catch (error) {
    throw new Error('Cannot connect to backend server. Make sure it\'s running on port 8000.');
  }
};

export const parseResume = async (file: File, jobDescription: string): Promise<ParseResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);

    const response = await api.post('/api/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Server error occurred');
    } else if (error.request) {
      throw new Error('No response from server. Check if backend is running.');
    } else {
      throw new Error('Error processing request');
    }
  }
};

export const getHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Backend health check failed');
  }
};

export default api;