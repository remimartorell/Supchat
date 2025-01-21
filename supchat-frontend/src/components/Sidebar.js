// src/components/Sidebar.js
import React from 'react';

function Sidebar({
                     users,
                     myWorkspaces,
                     onSelectUser,
                     onSelectChannel,
                     selectedUser,
                     selectedChannel,
                 }) {
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

                <h4>Workspaces + Channels</h4>

                {/* On affiche chaque workspace + ses channels */}
                {myWorkspaces.map((ws) => (
                    <div key={ws._id} style={{ marginBottom: '15px' }}>
                        <strong>{ws.name}</strong> <small>({ws._id})</small>
                        <ul style={{ listStyle: 'none', paddingLeft: '20px', marginTop: '5px' }}>
                            {ws.channels?.map((ch) => (
                                <li
                                    key={ch._id}
                                    onClick={() => onSelectChannel(ch._id)}
                                    style={{
                                        cursor: 'pointer',
                                        margin: '3px 0',
                                        background: ch._id === selectedChannel ? '#ddd' : '',
                                    }}
                                >
                                    {ch.name} ({ch.type})
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Sidebar;