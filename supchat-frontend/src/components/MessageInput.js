// src/components/MessageInput.js
import React, { useState } from 'react';
import './MessageInput.css'; // <-- On importe le fichier CSS

function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);

    const handleSend = () => {
        if (!text.trim() && !file) return;
        onSend(text.trim(), file);
        setText('');
        setFile(null);
    };

    return (
        <div className="message-input-container">
            {/* Champ texte */}
            <input
                type="text"
                placeholder="Tapez votre message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={disabled}
                className="message-input-field"
            />

            {/* Champ pour fichier */}
            <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                disabled={disabled}
                className="message-input-file"
            />

            {/* Bouton Envoyer */}
            <button
                onClick={handleSend}
                disabled={disabled}
                className="message-input-button"
            >
                Envoyer
            </button>

            {/* Prévisualisation d’image si on a choisi un fichier image */}
            {file && file.type.startsWith('image/') && (
                <div className="message-input-preview">
                    <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                    />
                </div>
            )}
        </div>
    );
}

export default MessageInput;
