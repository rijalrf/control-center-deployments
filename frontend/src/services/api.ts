import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor — redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login'
      if (!isLoginPage) window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
