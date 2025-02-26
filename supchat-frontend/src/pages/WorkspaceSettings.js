// src/pages/WorkspaceSettings.js
import React, { useEffect, useState } from 'react';
import axios from '../services/axiosConfig';
import { useParams, useNavigate } from 'react-router-dom';
import './WorkspaceSettings.css'; // Import du fichier CSS

function WorkspaceSettings() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();

    const [workspace, setWorkspace] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [channels, setChannels] = useState([]);

    // Ajout membre workspace
    const [selectedUserId, setSelectedUserId] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('member');

    // Renommer workspace
    const [workspaceName, setWorkspaceName] = useState('');

    useEffect(() => {
        fetchWorkspace();
        fetchAllUsers();
        fetchChannels();
    }, []);

    useEffect(() => {
        if (workspace) {
            setWorkspaceName(workspace.name);
            console.log('Workspace owner:', workspace.owner);
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
            console.error('Failed to fetch allUsers', err);
        }
    };

    const handleRoleChange = async (memberId, newRole) => {
        try {
            console.log('Attempting to update role for member:', memberId, 'to', newRole);
            await axios.put(`/api/workspaces/${workspaceId}/members/${memberId}`, { newRole });
            fetchWorkspace();
        } catch (err) {
            console.error('Error updating role', err);
            alert('Failed to update role');
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
            alert('Failed to remove member');
        }
    };

    const handleRenameWorkspace = async () => {
        try {
            await axios.put(`/api/workspaces/${workspaceId}`, { name: workspaceName });
            fetchWorkspace();
        } catch (err) {
            console.error('Error renaming workspace', err);
            alert('Failed to rename workspace');
        }
    };

    const handleDeleteWorkspace = async () => {
        const confirmDel = window.confirm('Supprimer ce workspace ?');
        if (!confirmDel) return;
        try {
            await axios.delete(`/api/workspaces/${workspaceId}`);
            alert('Workspace supprimé');
            navigate('/chat');
        } catch (err) {
            console.error('Erreur suppression workspace', err);
            alert('Impossible de supprimer ce workspace');
        }
    };

    const addUserToChannel = async (channelId, userId) => {
        if (!userId) return;
        try {
            await axios.post(`/api/workspaces/${workspaceId}/channels/${channelId}/members`, { memberId: userId });
            fetchChannels();
        } catch (err) {
            console.error('Error adding user to channel', err);
            alert('Impossible d’ajouter le membre au channel');
        }
    };

    const removeUserFromChannel = async (channelId, userId) => {
        try {
            await axios.delete(`/api/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`);
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

            {/* Section : Renommer le workspace */}
            <div className="settings-section">
                <h3>Renommer le Workspace</h3>
                <div className="rename-form">
                    <label className="label-rename">Nom :</label>
                    <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="settings-input"
                    />
                    <button onClick={handleRenameWorkspace} className="settings-button">
                        Renommer
                    </button>
                </div>
            </div>

            {/* Section : Membres */}
            <div className="settings-section">
                <h3>Membres</h3>
                {/* Conteneur scrollable pour la liste des membres */}
                <div className="scrollable-section">
                    <ul className="members-list">
                        {workspace.members.map((m) => (
                            <li key={m.user._id} className="member-item">
                                <div className="member-info">
                                    <span className="member-name">{m.user.name}</span>
                                    <span className="member-role">
                    Rôle :
                    <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user._id, e.target.value)}
                        className="settings-select"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                      <option value="member">Member</option>
                    </select>
                  </span>
                                </div>
                                {m.role !== 'owner' && (
                                    <button className="remove-member-button" onClick={() => handleRemoveMember(m.user._id)}>
                                        Retirer
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Ajouter un membre */}
                <div className="add-member-form">
                    <h4>Ajouter un membre</h4>
                    <div className="add-member-controls">
                        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="settings-select">
                            <option value="">-- Sélectionnez un utilisateur --</option>
                            {allUsers.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value)}
                            className="settings-select"
                            style={{ marginLeft: '10px' }}
                        >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                        </select>

                        <button onClick={handleAddMember} className="settings-button" style={{ marginLeft: '10px' }}>
                            Ajouter
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger zone */}
            <div className="settings-section">
                <h3>Danger Zone</h3>
                <p className="danger-description">
                    Supprimer ce workspace définitivement (action irréversible) :
                </p>
                <button className="delete-workspace-button" onClick={handleDeleteWorkspace}>
                    Supprimer le Workspace
                </button>
            </div>

            {/* Section : Channels Privés */}
            <div className="settings-section">
                <h3>Channels Privés</h3>
                {channels
                    .filter((ch) => ch.type === 'private')
                    .map((ch) => (
                        <div key={ch._id} className="private-channel-container">
                            <h4>{ch.name}</h4>
                            <ul className="channel-members-list">
                                {ch.members?.map((mem) => {
                                    const memId = mem._id || mem;
                                    const memName = mem.name ? mem.name : memId;
                                    return (
                                        <li key={memId} className="channel-member-item">
                                            <span>{memName}</span>
                                            <button onClick={() => removeUserFromChannel(ch._id, memId)} className="remove-member-button">
                                                Retirer
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div className="add-channel-member-form">
                                <select
                                    defaultValue=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            addUserToChannel(ch._id, e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                    className="settings-select"
                                >
                                    <option value="">-- Ajouter un membre --</option>
                                    {allUsers.map((u) => (
                                        <option key={u._id} value={u._id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

export default WorkspaceSettings;
