// src/pages/WorkspaceSettings.js
import React, { useEffect, useState } from 'react';
import axios from '../services/axiosConfig';
import { useParams, useNavigate } from 'react-router-dom';
import './WorkspaceSettings.css';

function WorkspaceSettings() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();

    const [workspace, setWorkspace] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [channels, setChannels] = useState([]);
    const [mutedChannels, setMutedChannels] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('mutedChannels')) || [];
        } catch {
            return [];
        }
    });

    // Mute/unmute d’un channel
    const toggleChannelMute = (channelId) => {
        setMutedChannels(prev => {
            const next = prev.includes(channelId)
                ? prev.filter(id => id !== channelId)
                : [...prev, channelId];
            localStorage.setItem('mutedChannels', JSON.stringify(next));
            return next;
        });
    };

    // Mute/unmute de tous les channels
    const toggleAllMute = () => {
        if (mutedChannels.length === channels.length) {
            // tous muted → unmute all
            setMutedChannels([]);
            localStorage.setItem('mutedChannels', JSON.stringify([]));
        } else {
            // sinon mute all
            const allIds = channels.map(ch => ch._id);
            setMutedChannels(allIds);
            localStorage.setItem('mutedChannels', JSON.stringify(allIds));
        }
    };

    // Pour l’ajout de membres
    const [selectedUserId, setSelectedUserId] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('member');
    // Pour renommer le workspace
    const [workspaceName, setWorkspaceName] = useState('');

    useEffect(() => {
        fetchWorkspace();
        fetchAllUsers();
        fetchChannels();
    }, []);

    useEffect(() => {
        if (workspace) {
            setWorkspaceName(workspace.name);
        }
    }, [workspace]);

    const fetchWorkspace = async () => {
        try {
            const res = await axios.get(`/api/workspaces/${workspaceId}`);
            setWorkspace(res.data);
        } catch (err) {
            console.error('Failed to fetch workspace', err);
        }
    };

    const fetchChannels = async () => {
        try {
            const res = await axios.get(`/api/workspaces/${workspaceId}/channels`);
            setChannels(res.data);
        } catch (err) {
            console.error('Failed to fetch channels', err);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get('/api/auth/allUsers');
            setAllUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch all users', err);
        }
    };

    const handleRoleChange = async (memberId, newRole) => {
        try {
            await axios.put(`/api/workspaces/${workspaceId}/members/${memberId}`, { newRole });
            fetchWorkspace();
        } catch (err) {
            console.error('Error updating role', err);
            alert('Impossible de mettre à jour le rôle');
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) return;
        try {
            await axios.post(`/api/workspaces/${workspaceId}/members`, {
                memberId: selectedUserId,
                role: newMemberRole,
            });
            fetchWorkspace();
            setSelectedUserId('');
            setNewMemberRole('member');
        } catch (err) {
            console.error('Error adding member', err);
            alert('Impossible d’ajouter ce membre');
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await axios.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
            fetchWorkspace();
        } catch (err) {
            console.error('Error removing member', err);
            alert('Impossible de retirer ce membre');
        }
    };

    const handleRenameWorkspace = async () => {
        try {
            await axios.put(`/api/workspaces/${workspaceId}`, { name: workspaceName });
            fetchWorkspace();
        } catch (err) {
            console.error('Error renaming workspace', err);
            alert('Impossible de renommer le workspace');
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!window.confirm('Supprimer ce workspace définitivement ?')) return;
        try {
            await axios.delete(`/api/workspaces/${workspaceId}`);
            alert('Workspace supprimé');
            navigate('/chat');
        } catch (err) {
            console.error('Error deleting workspace', err);
            alert('Impossible de supprimer le workspace');
        }
    };

    const addUserToChannel = async (channelId, userId) => {
        try {
            await axios.post(
                `/api/workspaces/${workspaceId}/channels/${channelId}/members`,
                { memberId: userId }
            );
            fetchChannels();
        } catch (err) {
            console.error('Error adding user to channel', err);
            alert('Impossible d’ajouter le membre au channel');
        }
    };

    const removeUserFromChannel = async (channelId, userId) => {
        try {
            await axios.delete(
                `/api/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`
            );
            fetchChannels();
        } catch (err) {
            console.error('Error removing user from channel', err);
            alert('Impossible de retirer le membre du channel');
        }
    };

    if (!workspace) {
        return <div className="workspace-settings-loading">Chargement des paramètres...</div>;
    }

    return (
        <div className="workspace-settings-container">
            <h2 className="workspace-settings-title">
                Paramètres du Workspace : <span>{workspace.name}</span>
            </h2>

            {/* Renommer le Workspace */}
            <div className="settings-section">
                <h3>Renommer le Workspace</h3>
                <div className="rename-form">
                    <label>Nom :</label>
                    <input
                        type="text"
                        value={workspaceName}
                        onChange={e => setWorkspaceName(e.target.value)}
                        className="settings-input"
                    />
                    <button onClick={handleRenameWorkspace} className="settings-button">
                        Renommer
                    </button>
                </div>
            </div>

            {/* Gérer les Membres */}
            <div className="settings-section">
                <h3>Membres</h3>
                <div className="scrollable-section">
                    <ul className="members-list">
                        {workspace.members.map(m => (
                            <li key={m.user._id} className="member-item">
                                <div className="member-info">
                                    <span className="member-name">{m.user.name}</span>
                                    <span className="member-role">
                    Rôle :
                    <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.user._id, e.target.value)}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                      <option value="member">Member</option>
                    </select>
                  </span>
                                </div>
                                {m.role !== 'owner' && (
                                    <button
                                        onClick={() => handleRemoveMember(m.user._id)}
                                        className="remove-member-button"
                                    >
                                        Retirer
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="add-member-form">
                    <h4>Ajouter un membre</h4>
                    <div className="add-member-controls">
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="settings-select"
                        >
                            <option value="">-- Sélectionnez un utilisateur --</option>
                            {allUsers.map(u => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                        </select>
                        <select
                            value={newMemberRole}
                            onChange={e => setNewMemberRole(e.target.value)}
                            className="settings-select"
                        >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button onClick={handleAddMember} className="settings-button">
                            Ajouter
                        </button>
                    </div>
                </div>
            </div>


            {/* Notifications Globales */}
            <div className="settings-section">
                <h3>Notifications Globales</h3>
                <button onClick={toggleAllMute} className="settings-button">
                    {mutedChannels.length === channels.length ? '🔔 Unmute All' : '🔕 Mute All'}
                </button>
            </div>

            {/* Channels Privés */}
            <div className="settings-section">
                <h3>Channels Privés</h3>
                {channels
                    .filter(ch => ch.type === 'private')
                    .map(ch => {
                        const isMuted = mutedChannels.includes(ch._id);
                        return (
                            <div key={ch._id} className="private-channel-container">
                                <h4 className="private-channel-header">
                                    {ch.name} 🔒
                                    <button
                                        onClick={() => toggleChannelMute(ch._id)}
                                        className="settings-button bell-btn"
                                        title={isMuted ? 'Unmute channel' : 'Mute channel'}
                                    >
                                        {isMuted ? '🔕' : '🔔'}
                                    </button>
                                </h4>
                                <ul className="channel-members-list">
                                    {ch.members?.map(mem => {
                                        const memId = mem._id || mem;
                                        const memName = mem.name || memId;
                                        return (
                                            <li key={memId} className="channel-member-item">
                                                <span>{memName}</span>
                                                <button
                                                    onClick={() => removeUserFromChannel(ch._id, memId)}
                                                    className="remove-member-button"
                                                >
                                                    Retirer
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div className="add-channel-member-form">
                                    <select
                                        defaultValue=""
                                        onChange={e => {
                                            if (e.target.value) {
                                                addUserToChannel(ch._id, e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="settings-select"
                                    >
                                        <option value="">-- Ajouter un membre --</option>
                                        {allUsers.map(u => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Danger Zone */}
            <div className="settings-section">
                <h3>Danger Zone</h3>
                <p>Supprimer définitivement ce workspace :</p>
                <button onClick={handleDeleteWorkspace} className="delete-workspace-button">
                    Supprimer le Workspace
                </button>
            </div>

        </div>
    );
}

export default WorkspaceSettings;
