// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/axiosConfig';
import './Sidebar.css'; // On importe le style fourni par votre collègue

function Sidebar({
                     userId,
                     users,
                     myWorkspaces,
                     onSelectUser,
                     onSelectChannel,
                     selectedUser,
                     selectedChannel,
                     onWorkspacesRefresh,
                     socket, // Nécessaire pour écouter "user-status-changed"
                 }) {
    const navigate = useNavigate();

    // =========================
    // État création workspace
    // =========================
    const [showCreateWs, setShowCreateWs] = useState(false);
    const [newWsName, setNewWsName] = useState('');

    // =========================
    // État création channel
    // =========================
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [targetWsId, setTargetWsId] = useState('');
    const [newChannelName, setNewChannelName] = useState('');
    const [channelType, setChannelType] = useState('public');
    const [channelMembers, setChannelMembers] = useState([]);

    // =========================
    // Statuts en ligne/offline
    // =========================
    const [userStatuses, setUserStatuses] = useState({});

    // On écoute "user-status-changed" pour mettre à jour userStatuses
    useEffect(() => {
        if (!socket) return;
        const handleStatusChange = ({ userId, status }) => {
            setUserStatuses(prev => ({ ...prev, [userId]: status }));
        };
        socket.on('user-status-changed', handleStatusChange);

        return () => {
            socket.off('user-status-changed', handleStatusChange);
        };
    }, [socket]);

    // =========================
    // Créer un workspace
    // =========================
    const handleCreateWorkspace = async () => {
        if (!newWsName.trim()) return;
        try {
            await axios.post('/api/workspaces', { name: newWsName.trim() });
            if (onWorkspacesRefresh) {
                onWorkspacesRefresh();
            }
            setNewWsName('');
            setShowCreateWs(false);
        } catch (err) {
            console.error('Erreur create workspace:', err);
            alert('Échec de création du workspace');
        }
    };

    // =========================
    // Créer un channel
    // =========================
    const handleCreateChannel = async () => {
        if (!newChannelName.trim() || !targetWsId) return;
        try {
            await axios.post(`/api/workspaces/${targetWsId}/channels`, {
                name: newChannelName.trim(),
                type: channelType,
                members: channelType === 'private' ? channelMembers : [],
            });
            if (onWorkspacesRefresh) {
                onWorkspacesRefresh();
            }
            // Reset
            setNewChannelName('');
            setTargetWsId('');
            setShowCreateChannel(false);
        } catch (err) {
            console.error('Erreur create channel:', err);
            alert('Échec de création du channel');
        }
    };

    return (
        <div className="sidebar">
            <h3>Sidebar</h3>

            <div className="sidebar-content">
                {/* ==== Liste des Users ==== */}
                <h4>Users</h4>
                <ul>
                    {users.map(u => {
                        const isSelected = (u._id === selectedUser);
                        return (
                            <li
                                key={u._id}
                                className={`sidebar-item ${isSelected ? 'sidebar-item-selected' : ''}`}
                                onClick={() => onSelectUser(u._id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                {/* Pastille de statut en ligne/offline */}
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor:
                                            userStatuses[u._id] === 'online'
                                                ? 'green'
                                                : 'gray',
                                    }}
                                />
                                {u.name} ({u.email})
                            </li>
                        );
                    })}
                </ul>

                {/* ==== Bouton/form pour créer un workspace ==== */}
                {!showCreateWs && (
                    <button className="sidebar-button" onClick={() => setShowCreateWs(true)}>
                        + Créer un workspace
                    </button>
                )}
                {showCreateWs && (
                    <div className="sidebar-form">
                        <input
                            type="text"
                            placeholder="Nom du workspace"
                            value={newWsName}
                            onChange={(e) => setNewWsName(e.target.value)}
                            className="sidebar-input"
                        />
                        <button className="sidebar-button" onClick={handleCreateWorkspace}>
                            Créer
                        </button>
                        <button className="sidebar-button" onClick={() => setShowCreateWs(false)}>
                            Annuler
                        </button>
                    </div>
                )}

                {/* ==== Liste des Workspaces + Channels ==== */}
                <h4 style={{ marginTop: '20px' }}>Workspaces + Channels</h4>
                {myWorkspaces.map(ws => {
                    // On cherche si l'utilisateur est membre
                    const currentMember = ws.members.find(m =>
                        m.user === userId ||
                        (typeof m.user === 'object' && m.user._id === userId)
                    );
                    const currentRole = currentMember ? currentMember.role : '';

                    return (
                        <div key={ws._id} style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <strong>{ws.name}</strong>
                                <small>({ws._id})</small>

                                {/* Bouton Settings */}
                                <button
                                    className="sidebar-button"
                                    onClick={() => navigate(`/workspace/${ws._id}/settings`)}
                                >
                                    Settings
                                </button>

                                {/* Si user est owner ou admin => +Channel */}
                                {(currentRole === 'owner' || currentRole === 'admin') && (
                                    <button
                                        className="sidebar-button"
                                        onClick={() => {
                                            setShowCreateChannel(true);
                                            setTargetWsId(ws._id);
                                        }}
                                    >
                                        +Channel
                                    </button>
                                )}
                            </div>

                            <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                                {(ws.channels || [])
                                    .filter(ch => {
                                        if (ch.type === 'public') return true;
                                        // channel privé => check si userId est dedans
                                        if (ch.type === 'private') {
                                            return ch.members?.some(m => {
                                                if (typeof m === 'string') return m === userId;
                                                return m._id === userId;
                                            });
                                        }
                                        return false;
                                    })
                                    .map(ch => {
                                        const isChSelected = (ch._id === selectedChannel);
                                        return (
                                            <li
                                                key={ch._id}
                                                className={`sidebar-item ${isChSelected ? 'sidebar-item-selected' : ''}`}
                                                onClick={() => onSelectChannel(ch._id)}
                                                style={{ margin: '3px 0' }}
                                            >
                                                {ch.name} ({ch.type})
                                                {/* Si owner/admin => bouton X pour supprimer */}
                                                {(currentRole === 'owner' || currentRole === 'admin') && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const confirmDel = window.confirm(
                                                                `Supprimer le channel "${ch.name}" ?`
                                                            );
                                                            if (!confirmDel) return;
                                                            try {
                                                                await axios.delete(
                                                                    `/api/workspaces/${ws._id}/channels/${ch._id}`
                                                                );
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
                                        );
                                    })}
                            </ul>
                        </div>
                    );
                })}

                {/* ==== Formulaire de création de channel (global) ==== */}
                {showCreateChannel && (
                    <div style={{ marginTop: '10px', background: '#2c2c2c', padding: '5px' }}>
                        <h5>Créer un channel dans workspace {targetWsId}</h5>
                        <input
                            type="text"
                            placeholder="Nom du channel"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            className="sidebar-input"
                            style={{ marginRight: '5px' }}
                        />
                        <div style={{ margin: '5px 0' }}>
                            <label>Type :</label>
                            <select
                                value={channelType}
                                onChange={(e) => setChannelType(e.target.value)}
                                style={{ marginLeft: '5px' }}
                            >
                                <option value="public">Public</option>
                                <option value="private">Privé</option>
                            </select>
                        </div>
                        {channelType === 'private' && (
                            <div>
                                <label>Members à inviter :</label>
                                <br />
                                <select
                                    multiple
                                    onChange={(e) => {
                                        const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                                        setChannelMembers(opts);
                                    }}
                                    style={{ marginTop: '5px' }}
                                >
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>
                                            {u.name} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button className="sidebar-button" onClick={handleCreateChannel}>
                            Créer
                        </button>
                        <button
                            className="sidebar-button"
                            onClick={() => {
                                setShowCreateChannel(false);
                                setNewChannelName('');
                                setTargetWsId('');
                            }}
                            style={{ marginLeft: '5px' }}
                        >
                            Annuler
                        </button>
                    </div>
                )}
            </div>

            {/*
                IMPORTANT : On NE VEUT PAS intégrer la partie "sidebar-footer"
                (barre de recherche, bouton Chat, bouton Logout)
                qui est dans la version de votre collègue.
                On supprime donc cette section.
            */}
        </div>
    );
}

export default Sidebar;
