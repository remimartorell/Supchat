// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

import './global.css';          // Styles globaux
import './styles/themes.css';   // Import du thème
<link rel="icon" href="%PUBLIC_URL%/icon.ico" />

// Appliquer le thème sauvegardé dès le chargement
const savedTheme = localStorage.getItem('appTheme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);
