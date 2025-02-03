// src/pages/WorkspaceSettings.js
import React, { useEffect, useState } from 'react';
import axios from '../services/axiosConfig';
import { useParams, useNavigate } from 'react-router-dom';

function WorkspaceSettings() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();

    // Le workspace actuel
    const [workspace, setWorkspace] = useState(null);

    // Liste de tous les utilisateurs (pour ajouter un membre)
    const [allUsers, setAllUsers] = useState([]);

    // Ajout pour channels
    const [channels, setChannels] = useState([]);

    // Champs pour l’ajout de membre
    const [selectedUserId, setSelectedUserId] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('member');

    // Champs pour renommer le workspace
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

    // Récupère le workspace (avec .members populé)
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
            setChannels(res.data); // un tableau de channels
        } catch (err) {
            console.error('Failed to fetch channels of workspace', err);
        }
    };

    // Récupère la liste de tous les utilisateurs
    const fetchAllUsers = async () => {
        try {
            const res = await axios.get('/api/auth/allUsers');
            setAllUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch allUsers', err);
        }
    };

    // Changer le rôle d’un membre
    const handleRoleChange = async (memberId, newRole) => {
        try {
            await axios.put(`/api/workspaces/${workspaceId}/members/${memberId}`, {
                newRole,
            });
            fetchWorkspace();
        } catch (err) {
            console.error('Error updating role', err);
            alert('Failed to update role');
        }
    };

    // Ajouter un membre
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

    // Supprimer un membre
    const handleRemoveMember = async (memberId) => {
        try {
            await axios.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
            fetchWorkspace();
        } catch (err) {
            console.error('Error removing member', err);
            alert('Failed to remove member');
        }
    };

    // Renommer le workspace
    const handleRenameWorkspace = async () => {
        try {
            await axios.put(`/api/workspaces/${workspaceId}`, {
                name: workspaceName,
            });
            fetchWorkspace();
        } catch (err) {
            console.error('Error renaming workspace', err);
            alert('Failed to rename workspace');
        }
    };

    // Supprimer le workspace
    const handleDeleteWorkspace = async () => {
        const confirmDel = window.confirm('Supprimer ce workspace ?');
        if (!confirmDel) return;
        try {
            await axios.delete(`/api/workspaces/${workspaceId}`);
            alert('Workspace supprimé');
            // Redirection vers /chat (ou autre)
            navigate('/chat');
        } catch (err) {
            console.error('Erreur suppression workspace', err);
            alert('Impossible de supprimer ce workspace');
        }
    };

    // ### NOUVELLES FONCTIONS : add/remove user dans channel ###
    const addUserToChannel = async (channelId, userId) => {
        if (!userId) return;
        try {
            await axios.post(`/api/workspaces/${workspaceId}/channels/${channelId}/members`, { memberId: userId });
            // On refetch la liste des channels pour voir l’update
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
        return <div>Loading workspace settings...</div>;
    }

    return (
        <div style={{padding: '10px'}}>
            <h2>Workspace Settings: {workspace.name}</h2>

            {/* Formulaire pour renommer */}
            <div style={{marginBottom: '20px'}}>
                <label>
                    <strong>Nom du workspace : </strong>
                </label>
                <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    style={{marginLeft: '5px'}}
                />
                <button onClick={handleRenameWorkspace} style={{marginLeft: '10px'}}>
                    Renommer
                </button>
            </div>

            <h3>Membres:</h3>
            <ul>
                {workspace.members.map((m) => (
                    <li key={m.user._id} style={{marginBottom: '8px'}}>
                        {m.user.name} ({m.user.email}) – role:
                        <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.user._id, e.target.value)}
                            style={{marginLeft: '5px'}}
                        >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="member">Member</option>
                        </select>
                        <button
                            style={{marginLeft: '5px', backgroundColor: '#f88'}}
                            onClick={() => handleRemoveMember(m.user._id)}
                        >
                            X
                        </button>
                    </li>
                ))}
            </ul>

            <hr/>

            <h4>Ajouter un membre</h4>
            <div style={{marginTop: '10px'}}>
                <label style={{marginRight: '5px'}}>Utilisateur :</label>
                <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                >
                    <option value="">-- Sélectionnez un utilisateur --</option>
                    {allUsers.map((u) => (
                        <option key={u._id} value={u._id}>
                            {u.name} ({u.email})
                        </option>
                    ))}
                </select>

                <label style={{margin: '0 5px 0 15px'}}>Role :</label>
                <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                >
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                </select>

                <button onClick={handleAddMember} style={{marginLeft: '10px'}}>
                    Ajouter
                </button>
            </div>

            <hr/>
            {/* Bouton pour supprimer le workspace */}
            <button
                style={{backgroundColor: '#f44', color: '#fff', marginTop: '20px'}}
                onClick={handleDeleteWorkspace}
            >
                Supprimer ce workspace
            </button>

            <hr/>
            <h3>Channels Privés</h3>
            {channels
                .filter((ch) => ch.type === 'private')
                .map((ch) => (
                    <div key={ch._id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px' }}>
                        <h4>{ch.name} (ID: {ch._id})</h4>

                        {/* Liste des membres de ce channel */}
                        <ul>
                            {ch.members?.map((mem) => {
                                // si c’est un array d’IDs => mem est un string
                                // si c’est populé => mem est un object { _id, name, email }
                                const memId = mem._id || mem;  // si 'mem' est un obj ou un string
                                const memName = (mem.name) ? mem.name : memId;
                                return (
                                    <li key={memId} style={{ marginBottom: '5px' }}>
                                        Membre: {memName}{' '}
                                        <button
                                            onClick={() => removeUserFromChannel(ch._id, memId)}
                                            style={{ backgroundColor: '#f66', marginLeft: '10px' }}
                                        >
                                            Retirer
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Form pour ajouter un nouveau membre */}
                        <div style={{ marginTop: '10px' }}>
                            <select
                                defaultValue=""
                                onChange={(e) => {
                                    // on stocke la value dans un attribut dataset par ex
                                    // ou on fait un setState local. Ici pour simplifier,
                                    // on va faire tout en un clic
                                    if (e.target.value) {
                                        addUserToChannel(ch._id, e.target.value);
                                        e.target.value = "";
                                    }
                                }}
                            >
                                <option value="">-- Ajouter un membre --</option>
                                {allUsers.map((u) => (
                                    <option key={u._id} value={u._id}>
                                        {u.name} ({u.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))
            }
        </div>
    );
}

export default WorkspaceSettings;