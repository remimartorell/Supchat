// src/pages/ProfileSettings.js
import React, { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';
import './ProfileSettings.css';

const themes = ['light', 'dark', 'midnight', 'solarized'];

const ProfileSettings = () => {
    const [pseudo, setPseudo]               = useState('');
    const [email, setEmail]                 = useState('');
    const [changePassword, setChangePassword] = useState(false);
    const [oldPassword, setOldPassword]     = useState('');
    const [newPassword, setNewPassword]     = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userId, setUserId]               = useState(null);
    const [avatarFile, setAvatarFile]       = useState(null);
    const [avatarUrl, setAvatarUrl]         = useState('/img/default-avatar.png');
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [selectedTheme, setSelectedTheme] = useState(localStorage.getItem('appTheme') || 'dark');

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('appTheme', selectedTheme);
    }, [selectedTheme]);

    const fetchUser = async () => {
        try {
            const res = await axios.get('/api/auth/user');
            const data = res.data;
            setUserId(data._id);
            setPseudo(data.name);
            setEmail(data.email);

            if (data.avatarFileId) {
                const url = `${process.env.REACT_APP_API_URL}/api/users/${data._id}/avatar?time=${Date.now()}`;
                setAvatarUrl(url);
            } else {
                setAvatarUrl('/img/default-avatar.png');
            }
            setAvatarPreview(null);
            setAvatarFile(null);
        } catch (err) {
            console.error('Erreur fetchUser :', err);
        }
    };

    const handleFileChange = e => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        try {
            const formData = new FormData();
            formData.append('name', pseudo);
            formData.append('email', email);
            formData.append('theme', selectedTheme);

            if (changePassword) {
                formData.append('oldPassword', oldPassword);
                formData.append('newPassword', newPassword);
                formData.append('confirmPassword', confirmPassword);
            }
            if (avatarFile) {
                formData.append('avatarFile', avatarFile);
            }

            await axios.put('/api/auth/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            alert('Profil mis à jour');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setChangePassword(false);
            fetchUser();
        } catch (err) {
            console.error('Erreur mise à jour profil :', err);
            alert('Impossible de mettre à jour');
        }
    };

    const handleExportData = async () => {
        try {
            const res = await axios.get('/api/auth/export-data', {
                responseType: 'blob'
            });
            // création d’un lien de téléchargement
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            // nommage du fichier tel que renvoyé par le back
            const disposition = res.headers['content-disposition'];
            let filename = 'export-data.json';
            if (disposition) {
                const match = disposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Erreur export data :', err);
            alert('Impossible d’exporter vos données');
        }
    };

    return (
        <div className="profile-settings-container">
            <h2>Paramètres du profil</h2>

            <div className="avatar-section">
                <img
                    src={avatarPreview || avatarUrl || '/img/default-avatar.png'}
                    alt="Avatar"
                    className="avatar-image"
                />
                <input type="file" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="profile-form-group">
                <label>Pseudo :</label>
                <input
                    type="text"
                    value={pseudo}
                    onChange={e => setPseudo(e.target.value)}
                />
            </div>

            <div className="profile-form-group">
                <label>Email :</label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
            </div>

            {!changePassword ? (
                <button
                    className="toggle-password-btn"
                    onClick={() => setChangePassword(true)}
                >
                    Changer le mot de passe
                </button>
            ) : (
                <div className="password-form">
                    <div className="password-field">
                        <label>Ancien MDP :</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div className="password-field">
                        <label>Nouveau MDP :</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="password-field">
                        <label>Confirmation :</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button
                        className="toggle-password-btn"
                        onClick={() => setChangePassword(false)}
                    >
                        Annuler
                    </button>
                </div>
            )}

            <div className="theme-selection">
                <p>Choisir un thème :</p>
                {themes.map(t => (
                    <label key={t} className="theme-radio-option">
                        <input
                            type="radio"
                            name="theme"
                            value={t}
                            checked={selectedTheme === t}
                            onChange={e => setSelectedTheme(e.target.value)}
                        />
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </label>
                ))}
            </div>

            <hr />

            <button className="save-button" onClick={handleSave}>
                Enregistrer
            </button>

            {/* Bouton d'export RGPD */}
            <button className="export-data-btn" onClick={handleExportData}>
                Exporter mes données personnelles
            </button>
        </div>
    );
};

export default ProfileSettings;
