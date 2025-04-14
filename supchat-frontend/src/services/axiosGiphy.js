// src/services/axiosGiphy.js
import axios from 'axios';

const axiosGiphy = axios.create({
    baseURL: 'https://api.giphy.com',
});

// Supprimer le header x-auth-token (hérité éventuellement d'autres configurations globales)
delete axiosGiphy.defaults.headers.common['x-auth-token'];

export default axiosGiphy;
