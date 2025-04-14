// src/services/axiosEmoji.js
import axios from 'axios';

const axiosEmoji = axios.create({
    baseURL: 'https://emoji-api.com',
});

export default axiosEmoji;
