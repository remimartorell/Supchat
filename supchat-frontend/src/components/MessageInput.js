// src/components/MessageInput.js
import React, { useState } from 'react';
import axios from '../services/axiosConfig';

function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);

    const handleSend = async () => {
        if (!text.trim() && !file) return;

        // On appelle la fonction de parent OU on gère directement ici
        onSend(text.trim(), file);

        setText('');
        setFile(null);
    };

    return (
        <div style={{ borderTop: '1px solid #ccc', padding: '10px' }}>
            <input
                type="text"
                placeholder="Tapez votre message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={disabled}
                style={{ width: '40%', marginRight: '10px' }}
            />
            <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                disabled={disabled}
                style={{ marginRight: '10px' }}
            />
            <button onClick={handleSend} disabled={disabled}>
                Envoyer
            </button>

            {/* PRÉVIEW IMAGE */}
            {file && file.type.startsWith('image/') && (
                <div style={{ marginTop: '10px' }}>
                    <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        style={{ maxWidth: '200px', height: 'auto' }}
                    />
                </div>
            )}
        </div>
    );
}

export default MessageInput;
