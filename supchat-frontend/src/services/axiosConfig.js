// src/services/axiosConfig.js
import axios from 'axios';

// On définit la baseURL à partir du .env ou un fallback
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Si déjà un token dans le localStorage, on le met dans le header
const token = localStorage.getItem('token');
if (token) {
    axios.defaults.headers.common['x-auth-token'] = token;
}

// Intercepteur global
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Supprime le token invalide
            localStorage.removeItem('token');
            // Et redirige vers la page de login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);


export default axios;