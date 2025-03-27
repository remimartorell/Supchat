/* src/pages/ProfileSettings.js */
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
        } catch (err) {
            console.error('Erreur fetchUser:', err);
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
                formData.append('avatar', avatarFile);
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

            <div style={{ textAlign:'center', marginBottom:'20px'}}>
                <img
                    src={avatarUrl}
                    alt="Avatar"
                    style={{ width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover'}}
                />
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e)=>{
                            if (e.target.files && e.target.files.length>0){
                                setAvatarFile(e.target.files[0]);
                            }
                        }}
                    />
                </div>
            </div>

            <div className="profile-form-group">
                <label>Pseudo:</label>
                <input
                    type="text"
                    value={pseudo}
                    onChange={(e)=>setPseudo(e.target.value)}
                />
            </div>

            <div className="profile-form-group">
                <label>Email:</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                />
            </div>

            {!changePassword ? (
                <button onClick={()=>setChangePassword(true)}>Changer MDP</button>
            ) : (
                <div>
                    <label>Ancien MDP:</label>
                    <input
                        type="password"
                        value={oldPassword}
                        onChange={(e)=>setOldPassword(e.target.value)}
                    />
                    <label>Nouveau MDP:</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e)=>setNewPassword(e.target.value)}
                    />
                    <label>Confirmer:</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e)=>setConfirmPassword(e.target.value)}
                    />
                    <button onClick={()=>setChangePassword(false)}>Annuler</button>
                </div>
            )}

            <hr />
            <button onClick={handleSave}>Enregistrer</button>
        </div>
    );
};

export default ProfileSettings;
