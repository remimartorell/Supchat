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

    // Champs pour l’ajout de membre
    const [selectedUserId, setSelectedUserId] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('member');

    // Champs pour renommer le workspace
    const [workspaceName, setWorkspaceName] = useState('');

    useEffect(() => {
        fetchWorkspace();
        fetchAllUsers();
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

    if (!workspace) {
        return <div>Loading workspace settings...</div>;
    }

    return (
        <div style={{ padding: '10px' }}>
            <h2>Workspace Settings: {workspace.name}</h2>

            {/* Formulaire pour renommer */}
            <div style={{ marginBottom: '20px' }}>
                <label>
                    <strong>Nom du workspace : </strong>
                </label>
                <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    style={{ marginLeft: '5px' }}
                />
                <button onClick={handleRenameWorkspace} style={{ marginLeft: '10px' }}>
                    Renommer
                </button>
            </div>

            <h3>Membres:</h3>
            <ul>
                {workspace.members.map((m) => (
                    <li key={m.user._id} style={{ marginBottom: '8px' }}>
                        {m.user.name} ({m.user.email}) – role:
                        <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.user._id, e.target.value)}
                            style={{ marginLeft: '5px' }}
                        >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="member">Member</option>
                        </select>
                        <button
                            style={{ marginLeft: '5px', backgroundColor: '#f88' }}
                            onClick={() => handleRemoveMember(m.user._id)}
                        >
                            X
                        </button>
                    </li>
                ))}
            </ul>

            <hr />

            <h4>Ajouter un membre</h4>
            <div style={{ marginTop: '10px' }}>
                <label style={{ marginRight: '5px' }}>Utilisateur :</label>
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

                <label style={{ margin: '0 5px 0 15px' }}>Role :</label>
                <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                >
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                </select>

                <button onClick={handleAddMember} style={{ marginLeft: '10px' }}>
                    Ajouter
                </button>
            </div>

            <hr />
            {/* Bouton pour supprimer le workspace */}
            <button
                style={{ backgroundColor: '#f44', color: '#fff', marginTop: '20px' }}
                onClick={handleDeleteWorkspace}
            >
                Supprimer ce workspace
            </button>
        </div>
    );
}

export default WorkspaceSettings;