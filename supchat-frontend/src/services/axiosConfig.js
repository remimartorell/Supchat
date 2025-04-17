// src/services/axiosConfig.js
import axios from 'axios';

axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api'; // ← ici le `/api` ajouté

const token = localStorage.getItem('token');
if (token) {
    axios.defaults.headers.common['x-auth-token'] = token;
}

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            console.error('ERREUR réseau : Impossible de contacter le serveur.');
        } else {
            const { status } = error.response;
            if (status === 401) {
                console.warn('Token invalide ou expiré => on déconnecte');
                localStorage.removeItem('token');
                delete axios.defaults.headers.common['x-auth-token'];
                window.location.href = '/login';
            } else if (status === 500) {
                console.error('Erreur 500 (serveur) :', error.response.data);
            }
        }
        return Promise.reject(error);
    }
);

export default axios;
