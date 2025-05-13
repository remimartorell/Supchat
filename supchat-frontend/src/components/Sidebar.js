// src/components/Slidebar.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/axiosConfig';
import { RiPushpinLine, RiPushpinFill } from 'react-icons/ri';
import { usePinned } from './usePinned';
import './Sidebar.css';

function Sidebar({ userId, users, myWorkspaces, onSelectUser, onSelectChannel, selectedUser, selectedChannel, onWorkspacesRefresh, socket }) {
    const navigate = useNavigate();
    const [pinned, togglePin] = usePinned();
    const [showCreateWs, setShowCreateWs] = useState(false);
    const [newWsName, setNewWsName] = useState('');
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [targetWsId, setTargetWsId] = useState('');
    const [newChannelName, setNewChannelName] = useState('');
    const [channelType, setChannelType] = useState('public');
    const [channelMembers, setChannelMembers] = useState([]);
    const [userStatuses, setUserStatuses] = useState({});

    useEffect(() => {
        if (!socket) return;
        socket.on('active-users', ids =>
            setUserStatuses(prev => ids.reduce((acc, id) => ({ ...acc, [id]: 'online' }), prev))
        );
        socket.on('user-connected', id => setUserStatuses(prev => ({ ...prev, [id]: 'online' })));
        socket.on('user-disconnected', id => setUserStatuses(prev => ({ ...prev, [id]: 'offline' })));
        return () => {
            socket.off('active-users');
            socket.off('user-connected');
            socket.off('user-disconnected');
        };
    }, [socket]);

    const getUserAvatar = u => {
        if (u.profilePicture) return process.env.REACT_APP_API_URL + u.profilePicture;
        if (u.avatarFileId) return `${process.env.REACT_APP_API_URL}/api/users/${u._id}/avatar`;
        return '/img/default-avatar.png';
    };

    const handleCreateWorkspace = async () => {
        if (!newWsName.trim()) return;
        try {
            await axios.post('/api/workspaces', { name: newWsName.trim() });
            onWorkspacesRefresh();
            setNewWsName('');
            setShowCreateWs(false);
        } catch (err) {
            console.error(err);
            alert('Échec création workspace');
        }
    };

    const handleCreateChannel = async () => {
        if (!newChannelName.trim() || !targetWsId) return;
        try {
            await axios.post(`/api/workspaces/${targetWsId}/channels`, {
                name: newChannelName.trim(),
                type: channelType,
                members: channelType === 'private' ? channelMembers : [],
            });
            onWorkspacesRefresh();
            setNewChannelName('');
            setShowCreateChannel(false);
            setTargetWsId('');
        } catch (err) {
            console.error(err);
            alert('Échec création channel');
        }
    };

    const pinnedUsers = users.filter(u => pinned.includes(u._id));
    const otherUsers = users.filter(u => !pinned.includes(u._id));

    const renderUser = u => {
        const isSel = u._id === selectedUser;
        const status = userStatuses[u._id] || 'offline';
        const dotColor = status === 'online' ? 'green' : 'red';

        return (
            <li
                key={u._id}
                className={`sidebar-item ${isSel ? 'sidebar-item-selected' : ''}`}
                onClick={() => onSelectUser(u._id)}
            >
                <div className="sidebar-user-row">
                    <img src={getUserAvatar(u)} alt="avatar" className="sidebar-avatar" />
                    <span
                        className="sidebar-status-dot"
                        style={{ backgroundColor: dotColor }}
                    />
                    <span className="sidebar-username">{u.name}</span>
                </div>
                <button
                    className="sidebar-pin-btn"
                    onClick={e => { e.stopPropagation(); togglePin(u._id); }}
                    title={pinned.includes(u._id) ? 'Désépingler' : 'Épingler'}
                >
                    {pinned.includes(u._id)
                        ? <RiPushpinFill className="pinned" />
                        : <RiPushpinLine className="unpinned" />
                    }
                </button>

            </li>
        );
    };

    return (
        <div className="sidebar">
            {pinnedUsers.length > 0 && (
                <>
                    <h4 className="sidebar-section-title">UTILISATEURS ÉPINGLÉS</h4>
                    <ul className="sidebar-list pinned-list">
                        {pinnedUsers.map(renderUser)}
                    </ul>
                    <hr className="pinned-separator" />
                </>
            )}

            <h4 className="sidebar-section-title">Utilisateurs</h4>
            <ul className="sidebar-list">
                {otherUsers.map(renderUser)}
            </ul>

            {!showCreateWs ? (
                <button className="sidebar-button" onClick={() => setShowCreateWs(true)}>
                    + Créer un workspace
                </button>
            ) : (
                <div className="sidebar-form">
                    <input
                        className="sidebar-input"
                        value={newWsName}
                        onChange={e => setNewWsName(e.target.value)}
                        placeholder="Nom workspace…"
                    />
                    <div>
                        <button className="sidebar-button" onClick={handleCreateWorkspace}>
                            Créer
                        </button>
                        <button className="sidebar-button" onClick={() => setShowCreateWs(false)}>
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* Workspaces + Channels… */}
            <h4 className="sidebar-section-title" style={{ marginTop: 20 }}>
                Workspaces + Channels
            </h4>
            {myWorkspaces.map((ws) => {
                const member = ws.members.find((m) =>
                    m.user === userId ||
                    (typeof m.user === 'object' && m.user._id === userId)
                );
                const role = member?.role || '';
                return (
                    <div key={ws._id} className="sidebar-workspace">
                        <div className="sidebar-ws-header">
                            <strong>{ws.name}</strong>
                            <div>
                                <button
                                    className="sidebar-button"
                                    onClick={() => navigate(`/workspace/${ws._id}/settings`)}
                                >
                                    Settings
                                </button>
                                {(role === 'owner' || role === 'admin') && (
                                    <button
                                        className="sidebar-button"
                                        onClick={() => {
                                            setShowCreateChannel(true);
                                            setTargetWsId(ws._id);
                                        }}
                                    >
                                        + Channel
                                    </button>
                                )}
                            </div>
                        </div>
                        <ul className="sidebar-list" style={{ paddingLeft: 16 }}>
                            {(ws.channels || [])
                                .filter(ch =>
                                    ch.type === 'public' ||
                                    (ch.type === 'private' &&
                                        ch.members.some(m =>
                                            typeof m === 'string'
                                                ? m === userId
                                                : m._id === userId
                                        )
                                    )
                                )
                                .map((ch) => {
                                    const isChSel = ch._id === selectedChannel;
                                    return (
                                        <li
                                            key={ch._id}
                                            className={`sidebar-item ${
                                                isChSel ? 'sidebar-item-selected' : ''
                                            }`}
                                            onClick={() => onSelectChannel(ch._id)}
                                        >
                      <span className="sidebar-channel-name">
                        #{ch.name}
                      </span>
                                            {(role === 'owner' || role === 'admin') && (
                                                <button
                                                    className="sidebar-button"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (
                                                            window.confirm(
                                                                `Supprimer le channel "${ch.name}" ?`
                                                            )
                                                        ) {
                                                            await axios.delete(
                                                                `/api/workspaces/${ws._id}/channels/${ch._id}`
                                                            );
                                                            onWorkspacesRefresh();
                                                        }
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

            {/* Form création channel */}
            {showCreateChannel && (
                <div className="sidebar-form" style={{ background: '#2c2c2c' }}>
                    <h5>Créer channel dans {targetWsId}</h5>
                    <input
                        className="sidebar-input"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="Nom channel…"
                    />
                    <div>
                        <label>Type :</label>
                        <select
                            value={channelType}
                            onChange={(e) => setChannelType(e.target.value)}
                        >
                            <option value="public">Public</option>
                            <option value="private">Privé</option>
                        </select>
                    </div>
                    {channelType === 'private' && (
                        <select
                            multiple
                            onChange={(e) =>
                                setChannelMembers(
                                    Array.from(e.target.selectedOptions).map((o) => o.value)
                                )
                            }
                        >
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <div>
                        <button className="sidebar-button" onClick={handleCreateChannel}>
                            Créer
                        </button>
                        <button
                            className="sidebar-button"
                            onClick={() => setShowCreateChannel(false)}
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Sidebar;
