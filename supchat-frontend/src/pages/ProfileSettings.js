// src/pages/ProfileSettings.js
import React, { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';
import './ProfileSettings.css';

const ProfileSettings = () => {
    const [pseudo, setPseudo] = useState('');
    const [email, setEmail] = useState('');
    const [changePassword, setChangePassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [userId, setUserId] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState('/img/default-avatar.png');
    const [avatarPreview, setAvatarPreview] = useState(null);

    useEffect(() => {
        fetchUser();
    }, []);

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
            console.error('Erreur fetchUser:', err);
        }
    };

    const handleFileChange = (e) => {
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
            console.error('Erreur mise à jour profil:', err);
            alert('Impossible de mettre à jour');
        }
    };

    return (
        <div className="profile-settings-container">
            <h2>Paramètres du profil</h2>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <img
                    src={avatarPreview || avatarUrl}
                    alt="Avatar"
                    style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                </div>
            </div>

            <div className="profile-form-group">
                <label>Pseudo:</label>
                <input type="text" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
            </div>

            <div className="profile-form-group">
                <label>Email:</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {!changePassword ? (
                <button className="toggle-password-btn" onClick={() => setChangePassword(true)}>Changer MDP</button>
            ) : (
                <div className="password-form">
                    <div className="profile-form-group">
                        <label>Ancien MDP:</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div className="profile-form-group">
                        <label>Nouveau MDP:</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="profile-form-group">
                        <label>Confirmer:</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button className="toggle-password-btn" onClick={() => setChangePassword(false)}>Annuler</button>
                </div>
            )}

            <hr />
            <button className="save-button" onClick={handleSave}>Enregistrer</button>
        </div>
    );
};

export default ProfileSettings;
