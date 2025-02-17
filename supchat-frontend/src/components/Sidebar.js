// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
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
                     // Assurez-vous de recevoir également la socket en prop si vous l’utilisez
                     socket,
                 }) {
    const navigate = useNavigate();

    // État pour la création de workspace
    const [showCreateWs, setShowCreateWs] = useState(false);
    const [newWsName, setNewWsName] = useState('');

    // État pour la création de channel
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [targetWsId, setTargetWsId] = useState('');
    const [newChannelName, setNewChannelName] = useState('');

    // Nouvel état pour les statuts (online/offline) des utilisateurs
    const [userStatuses, setUserStatuses] = useState({});

    // Écoute de l’événement "user-status-changed" sur la socket
    useEffect(() => {
        if (socket) {
            const handleStatusChange = ({ userId, status }) => {
                setUserStatuses(prev => ({ ...prev, [userId]: status }));
            };
            socket.on('user-status-changed', handleStatusChange);
            return () => {
                socket.off('user-status-changed', handleStatusChange);
            };
        }
    }, [socket]);

    // Fonction de création de workspace
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

    // État et fonction pour la création de channel
    const [channelType, setChannelType] = useState('public');
    const [channelMembers, setChannelMembers] = useState([]);
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
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
              <span
                  style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: userStatuses[u._id] === 'online' ? 'green' : 'gray',
                      marginRight: '5px',
                  }}
              ></span>
                            {u.name} ({u.email})
                        </li>
                    ))}
                </ul>

                {/* Formulaire de création de workspace */}
                <div style={{ marginTop: '15px' }}>
                    {!showCreateWs ? (
                        <button
                            onClick={() => setShowCreateWs(true)}
                            style={{ margin: '5px 0', cursor: 'pointer', background: '#ccc', border: '1px solid #999' }}
                        >
                            + Créer un workspace
                        </button>
                    ) : (
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
                    const currentMember = ws.members.find(
                        (m) => m.user === userId || (typeof m.user === 'object' && m.user._id === userId)
                    );
                    const currentRole = currentMember ? currentMember.role : '';
                    return (
                        <div key={ws._id} style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <strong>{ws.name}</strong>
                                <small>({ws._id})</small>
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
                                {ws.channels
                                    ?.filter((ch) => {
                                        if (ch.type === 'public') return true;
                                        if (ch.type === 'private') {
                                            return ch.members?.some((m) => {
                                                if (typeof m === 'string') return m === userId;
                                                return m._id === userId;
                                            });
                                        }
                                        return false;
                                    })
                                    ?.map((ch) => (
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
                                            {(currentRole === 'owner' || currentRole === 'admin') && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
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
                                <select
                                    multiple
                                    onChange={(e) => {
                                        const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                                        setChannelMembers(opts);
                                    }}
                                >
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>
                                            {u.name} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button onClick={handleCreateChannel}>Créer</button>
                        <button onClick={() => { setShowCreateChannel(false); setNewChannelName(''); setTargetWsId(''); }} style={{ marginLeft: '5px' }}>
                            Annuler
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Sidebar;