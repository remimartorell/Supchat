// src/components/Sidebar.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/axiosConfig';

function Sidebar({
                     userId,
                     users,
                     myWorkspaces,
                     onSelectUser,
                     onSelectChannel,
                     selectedUser,
                     selectedChannel,
                     onWorkspacesRefresh,
                 }) {
    /**
     * onWorkspacesRefresh : callback pour dire au parent "j’ai créé un workspace ou un channel, refetch la liste"
     * Tu peux aussi directement refetch ici si tu préfères, en appelant la même route GET /api/workspaces
     * que tu fais dans Chat.js, etc.
     */

    const navigate = useNavigate();

    // État pour le “Créer un workspace”
    const [showCreateWs, setShowCreateWs] = useState(false);
    const [newWsName, setNewWsName] = useState('');

    // État pour la création de channel (un seul “mini form” pour la démo)
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [targetWsId, setTargetWsId] = useState('');
    const [newChannelName, setNewChannelName] = useState('');

    // 1) Création workspace
    const handleCreateWorkspace = async () => {
        if (!newWsName.trim()) return;
        try {
            await axios.post('/api/workspaces', { name: newWsName.trim() });
            // Si tu veux ensuite refetch la liste des workspaces
            if (onWorkspacesRefresh) {
                onWorkspacesRefresh();
            }
            // on “reset” le formulaire
            setNewWsName('');
            setShowCreateWs(false);
        } catch (err) {
            console.error('Erreur create workspace:', err);
            alert('Échec de création du workspace');
        }
    };

    // 2) Création channel
    const handleCreateChannel = async () => {
        if (!newChannelName.trim() || !targetWsId) return;
        try {
            await axios.post(`/api/workspaces/${targetWsId}/channels`, {
                name: newChannelName.trim(),
                type: 'public', // ou “private”
            });
            if (onWorkspacesRefresh) {
                onWorkspacesRefresh();
            }
            // Reset form
            setNewChannelName('');
            setTargetWsId('');
            setShowCreateChannel(false);
        } catch (err) {
            console.error('Erreur create channel:', err);
            alert('Échec de création du channel');
        }
    };

    return (
        <div style={{ width: '250px', background: '#fafafa', borderRight: '1px solid #ccc' }}>
            <h3 style={{ padding: '10px' }}>Sidebar</h3>

            <div style={{ padding: '0 10px' }}>
                <h4>Users</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {users.map((u) => (
                        <li
                            key={u._id}
                            onClick={() => onSelectUser(u._id)}
                            style={{
                                cursor: 'pointer',
                                margin: '5px 0',
                                background: u._id === selectedUser ? '#ddd' : '',
                                padding: '5px',
                            }}
                        >
                            {u.name} ({u.email})
                        </li>
                    ))}
                </ul>

                {/* --- Bouton / Form pour créer un workspace --- */}
                <div style={{ marginTop: '15px' }}>
                    {!showCreateWs && (
                        <button
                            onClick={() => setShowCreateWs(true)}
                            style={{
                                margin: '5px 0',
                                cursor: 'pointer',
                                background: '#ccc',
                                border: '1px solid #999',
                            }}
                        >
                            + Créer un workspace
                        </button>
                    )}
                    {showCreateWs && (
                        <div style={{ marginTop: '5px' }}>
                            <input
                                type="text"
                                placeholder="Nom du workspace"
                                value={newWsName}
                                onChange={(e) => setNewWsName(e.target.value)}
                                style={{ marginRight: '5px' }}
                            />
                            <button onClick={handleCreateWorkspace}>Créer</button>
                            <button onClick={() => setShowCreateWs(false)} style={{ marginLeft: '5px' }}>
                                Annuler
                            </button>
                        </div>
                    )}
                </div>

                <h4 style={{ marginTop: '20px' }}>Workspaces + Channels</h4>
                {myWorkspaces.map((ws) => {
                    // On cherche le member object pour l’utilisateur courant
                    const currentMember = ws.members.find(m => m.user === userId
                        || (typeof m.user === 'object' && m.user._id === userId));
                    const currentRole = currentMember ? currentMember.role : '';

                    return (
                        <div key={ws._id} style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <strong>{ws.name}</strong>
                                <small>({ws._id})</small>

                                {/* Bouton Settings */}
                                <button
                                    onClick={() => navigate(`/workspace/${ws._id}/settings`)}
                                    style={{
                                        cursor: 'pointer',
                                        background: '#ddd',
                                        border: '1px solid #999',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                    }}
                                >
                                    Settings
                                </button>

                                {/* Si l’utilisateur est owner ou admin => bouton +Channel */}
                                {(currentRole === 'owner' || currentRole === 'admin') && (
                                    <button
                                        onClick={() => {
                                            setShowCreateChannel(true);
                                            setTargetWsId(ws._id);
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            background: '#eee',
                                            border: '1px solid #999',
                                            borderRadius: '4px',
                                            padding: '2px 4px',
                                        }}
                                    >
                                        +Channel
                                    </button>
                                )}
                            </div>

                            <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                                {ws.channels?.map((ch) => (
                                    <li
                                        key={ch._id}
                                        onClick={() => onSelectChannel(ch._id)}
                                        style={{
                                            cursor: 'pointer',
                                            margin: '3px 0',
                                            background: ch._id === selectedChannel ? '#ddd' : '',
                                            padding: '3px',
                                        }}
                                    >
                                        {ch.name} ({ch.type})
                                        {/* Optionnel: bouton (X) pour supprimer le channel si role=owner/admin */}
                                        {(currentRole === 'owner' || currentRole === 'admin') && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    // pour ne pas “sélectionner” le channel en même temps
                                                    const confirmDel = window.confirm(`Supprimer le channel "${ch.name}" ?`);
                                                    if (!confirmDel) return;
                                                    try {
                                                        await axios.delete(`/api/workspaces/${ws._id}/channels/${ch._id}`);
                                                        onWorkspacesRefresh && onWorkspacesRefresh();
                                                    } catch (err) {
                                                        console.error('Erreur suppression channel:', err);
                                                        alert('Impossible de supprimer ce channel');
                                                    }
                                                }}
                                                style={{
                                                    marginLeft: '5px',
                                                    cursor: 'pointer',
                                                    background: '#f88',
                                                    border: '1px solid #999',
                                                    borderRadius: '4px',
                                                    padding: '0 4px',
                                                }}
                                            >
                                                X
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}

                {/* Formulaire “Créer channel” (global, se base sur targetWsId) */}
                {showCreateChannel && (
                    <div style={{ marginTop: '10px', background: '#f5f5f5', padding: '5px' }}>
                        <h5>Créer un channel dans workspace {targetWsId}</h5>
                        <input
                            type="text"
                            placeholder="Nom du channel"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            style={{ marginRight: '5px' }}
                        />
                        <button onClick={handleCreateChannel}>Créer</button>
                        <button onClick={() => {
                            setShowCreateChannel(false);
                            setNewChannelName('');
                            setTargetWsId('');
                        }} style={{ marginLeft: '5px' }}>
                            Annuler
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Sidebar;