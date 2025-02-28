// src/pages/ResetPassword.js
import React, { useState } from 'react';
import axios from '../services/axiosConfig';
import { useSearchParams } from 'react-router-dom';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return setMessage('Les deux mots de passe ne correspondent pas.');
        }
        try {
            const res = await axios.post('/api/auth/reset-password', {
                token,
                newPassword,
                confirmPassword,
            });
            setMessage(res.data.msg || 'Mot de passe réinitialisé !');
        } catch (err) {
            console.error(err);
            if (err.response?.data?.msg) {
                setMessage(err.response.data.msg);
            } else {
                setMessage('Erreur lors de la réinitialisation.');
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2 className="login-title">Nouveau mot de passe</h2>
                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="password"
                        placeholder="Nouveau mot de passe"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="login-input"
                    />
                    <input
                        type="password"
                        placeholder="Confirmer"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="login-input"
                    />
                    <button type="submit" className="login-submit-btn">
                        Valider
                    </button>
                </form>

                {message && <p style={{ marginTop: '1rem' }}>{message}</p>}

                <div className="login-footer-link" style={{ marginTop: '1rem' }}>
                    <span>Retour à </span>
                    <a href="/login" style={{ color: '#fff', textDecoration: 'underline' }}>
                        la connexion
                    </a>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;