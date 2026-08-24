import axios from 'axios'

// Axios client mapping to backend API
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach JWT Access Token
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor: Automatically Refresh Token on Expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Check if error is 401 (Unauthorized) and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          // Request new access token using refresh token
          const refreshResponse = await axios.post('/api/token/refresh', {
            refresh: refreshToken
          })
          
          const newAccessToken = refreshResponse.data.access
          localStorage.setItem('access_token', newAccessToken)
          
          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          }
          return apiClient(originalRequest)
        } catch (refreshError) {
          // If refresh token is expired/invalid, clear auth data and redirect to login page
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.dispatchEvent(new Event('auth_session_expired'))
          return Promise.reject(refreshError)
        }
      } else {
        window.dispatchEvent(new Event('auth_session_expired'))
      }
    }
    
    // Standardize error messaging structure
    return Promise.reject({
      message: error.response?.data?.detail || error.message || 'An unexpected error occurred.',
      errors: error.response?.data?.errors || null,
      status: error.response?.status || 500,
    })
  }
)
