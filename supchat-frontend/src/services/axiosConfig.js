// src/services/axiosConfig.js
import axios from 'axios';

// 1) Définir la baseURL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// 2) Récupérer un token (si déjà stocké) et l'injecter dans les headers
const token = localStorage.getItem('token');
if (token) {
    axios.defaults.headers.common['x-auth-token'] = token;
}

// 3) Intercepteurs de réponse
axios.interceptors.response.use(
    (response) => {
        // Réponse réussie => on la renvoie telle quelle
        return response;
    },
    (error) => {
        // a) Erreur réseau ou aucune réponse
        if (!error.response) {
            // ex: net::ERR_CONNECTION_REFUSED
            console.error('ERREUR réseau : Impossible de contacter le serveur.');
            // ici, on peut décider de faire un popup, ou juste un log
        } else {
            // b) Erreur HTTP avec une response
            const { status } = error.response;
            if (status === 401) {
                // Token invalide ou expiré => on supprime et on redirige
                console.warn('Token invalide ou expiré => on déconnecte');
                localStorage.removeItem('token');
                delete axios.defaults.headers.common['x-auth-token'];
                window.location.href = '/login';
            } else if (status === 500) {
                // Erreur interne côté serveur
                console.error('Erreur 500 (serveur) :', error.response.data);
                // éventuellement un alert()...
            }
        }

        // On rejette l’erreur pour la chaîne de promesses
        return Promise.reject(error);
    }
);

export default axios;
