// src/components/MessageInput.js
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // instance globale
import axiosGiphy from '../services/axiosGiphy'; // instance dédiée pour GIPHY (sans header x-auth-token)
import axiosEmoji from '../services/axiosEmoji';   // instance dédiée pour les emojis
import { IoMdAttach, IoMdHappy } from 'react-icons/io';
import './MessageInput.css';

const GIF_LIMIT = 15;
const STORAGE_KEY_RECENT_GIFS = 'recentGifs';
const STORAGE_KEY_RECENT_EMOJIS = 'recentEmojis';

// Fonctions utilitaires pour le localStorage
function loadLocalArray(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveLocalArray(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
}

function pushRecentItem(key, item, maxLength = GIF_LIMIT) {
    let arr = loadLocalArray(key);
    arr = arr.filter(el => el !== item);
    arr.unshift(item);
    if (arr.length > maxLength) arr = arr.slice(0, maxLength);
    saveLocalArray(key, arr);
}

// Nettoie la clé GIPHY (au cas où elle contiendrait des guillemets)
const getCleanGiphyKey = () => {
    const key = process.env.REACT_APP_GIPHY_API_KEY || '';
    return key.replace(/"/g, '');
};

function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [activeMainTab, setActiveMainTab] = useState('gif'); // "gif" ou "emoji"

    // --------------------
    // Gestion des GIFs
    // --------------------
    const [gifTab, setGifTab] = useState('trending'); // "trending", "recent" ou "search"
    const [gifSearch, setGifSearch] = useState('');
    const [gifResults, setGifResults] = useState([]);
    const [loadingGifs, setLoadingGifs] = useState(false);
    const [recentGifs, setRecentGifs] = useState(loadLocalArray(STORAGE_KEY_RECENT_GIFS));

    // --------------------
    // Gestion des Emojis
    // --------------------
    const [emojiSubTab, setEmojiSubTab] = useState('all'); // "all", "recent" ou "search"
    const [emojiSearch, setEmojiSearch] = useState('');
    const [emojiListData, setEmojiListData] = useState([]);
    const [recentEmojis, setRecentEmojis] = useState(loadLocalArray(STORAGE_KEY_RECENT_EMOJIS));

    // Définition d'une liste de secours pour les emojis
    const fallbackEmojiList = ['😃', '😂', '😍', '😎', '😉', '👍', '🎉', '🔥', '😭', '🙌'];

    // Filtrage des emojis pour l'onglet "search"
    const filteredEmojiList = emojiListData.filter(item => {
        // On essaie de récupérer le caractère et un nom alternatif (slug ou unicodeName) si disponible
        const emojiChar = typeof item === 'object' ? item.character : item;
        const emojiName = typeof item === 'object' ? (item.slug || item.unicodeName || '') : '';
        const queryLower = emojiSearch.toLowerCase();
        return (
            emojiChar.toLowerCase().includes(queryLower) ||
            emojiName.toLowerCase().includes(queryLower)
        );
    });

    const giphyKey = getCleanGiphyKey();

    // Vérification de la clé GIPHY
    useEffect(() => {
        console.log("Clé GIPHY API détectée :", giphyKey);
        if (!giphyKey) {
            console.warn("⚠️ Clé GIPHY manquante. Les GIFs ne fonctionneront pas.");
        }
    }, [giphyKey]);

    // Gestion des GIFs : lorsque le menu est ouvert et que l'onglet GIF est actif
    useEffect(() => {
        if (!showMenu || activeMainTab !== 'gif') return;
        if (gifTab === 'trending') {
            fetchTrendingGifs();
        } else if (gifTab === 'search') {
            fetchSearchGifs(gifSearch);
        }
        // L’onglet "recent" affiche uniquement les GIFs stockés localement
    }, [gifTab, activeMainTab, gifSearch, showMenu]);

    const fetchTrendingGifs = async () => {
        if (!giphyKey) return console.error("La clé GIPHY n'est pas configurée");
        setLoadingGifs(true);
        try {
            const response = await axiosGiphy.get('/v1/gifs/trending', {
                params: {
                    api_key: giphyKey,
                    limit: GIF_LIMIT,
                    rating: 'pg-13'
                }
            });
            setGifResults(response.data.data || []);
        } catch (err) {
            console.error('Erreur fetch trending GIFs :', err);
        }
        setLoadingGifs(false);
    };

    const fetchSearchGifs = async (query) => {
        if (!giphyKey) return console.error("La clé GIPHY n'est pas configurée");
        if (!query.trim()) return setGifResults([]);
        setLoadingGifs(true);
        try {
            const response = await axiosGiphy.get('/v1/gifs/search', {
                params: {
                    api_key: giphyKey,
                    q: query,
                    limit: GIF_LIMIT,
                    rating: 'pg-13',
                    lang: 'fr'
                }
            });
            setGifResults(response.data.data || []);
        } catch (err) {
            console.error('Erreur fetch search GIFs :', err);
        }
        setLoadingGifs(false);
    };

    // Gestion des Emojis : si l'onglet emoji est actif, récupérer la liste via API si nécessaire
    useEffect(() => {
        if (activeMainTab === 'emoji' && emojiListData.length === 0) {
            fetchEmojis();
        }
    }, [activeMainTab, emojiListData.length]);

    const fetchEmojis = async () => {
        try {
            const response = await axiosEmoji.get('/emojis', {
                params: {
                    access_key: process.env.REACT_APP_EMOJI_API_KEY,
                },
            });
            // On récupère la liste complète d'emojis depuis l'API
            setEmojiListData(response.data || []);
        } catch (err) {
            console.error("Erreur fetch emojis :", err);
        }
    };

    // Sélection d'un GIF : on envoie directement et on met à jour les GIFs récents
    const handleGifSelect = (gifUrl) => {
        onSend(gifUrl, null);
        setShowMenu(false);
        pushRecentItem(STORAGE_KEY_RECENT_GIFS, gifUrl);
        setRecentGifs(loadLocalArray(STORAGE_KEY_RECENT_GIFS));
    };

    const handleSend = () => {
        if (!text.trim() && !file) return;
        onSend(text.trim(), file);
        setText('');
        setFile(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    // Sélection d'un emoji : envoie immédiate et mise à jour des emojis récents
    const handleEmojiSelect = (emoji) => {
        onSend(emoji, null);
        setShowMenu(false);
        pushRecentItem(STORAGE_KEY_RECENT_EMOJIS, emoji, 30);
        setRecentEmojis(loadLocalArray(STORAGE_KEY_RECENT_EMOJIS));
    };

    // Pour l'affichage des emojis dans l'onglet "emoji"
    let emojisToDisplay = [];
    if (emojiSubTab === 'recent') {
        emojisToDisplay = recentEmojis;
    } else if (emojiSubTab === 'search') {
        emojisToDisplay = emojiSearch.trim() === '' ? emojiListData : filteredEmojiList;
    } else { // "all"
        emojisToDisplay = emojiListData.length > 0 ? emojiListData : fallbackEmojiList;
    }

    return (
        <div className="message-input-container">
            <input
                type="text"
                placeholder="Tapez votre message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="message-input-field"
            />
            <input
                id="fileInput"
                type="file"
                onChange={handleFileChange}
                disabled={disabled}
                style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" className="message-clip-label">
                <IoMdAttach size={20} color="#fff" />
            </label>
            <button
                type="button"
                className="gif-emoji-toggle-btn"
                onClick={() => setShowMenu((prev) => !prev)}
                disabled={disabled}
            >
                <IoMdHappy size={20} color="#fff" />
            </button>
            <button
                onClick={handleSend}
                disabled={disabled}
                className="message-input-button"
            >
                Envoyer
            </button>

            {file && file.type.startsWith('image/') && (
                <div className="message-input-preview">
                    <img src={URL.createObjectURL(file)} alt="preview" />
                </div>
            )}

            {showMenu && (
                <div className="gif-emoji-menu">
                    <div className="gif-emoji-tabs">
                        <button
                            className={`gif-emoji-tab ${activeMainTab === 'gif' ? 'active' : ''}`}
                            onClick={() => setActiveMainTab('gif')}
                        >
                            GIF
                        </button>
                        <button
                            className={`gif-emoji-tab ${activeMainTab === 'emoji' ? 'active' : ''}`}
                            onClick={() => setActiveMainTab('emoji')}
                        >
                            Emoji
                        </button>
                    </div>

                    {activeMainTab === 'gif' && (
                        <>
                            <div className="gif-emoji-tabs">
                                <button
                                    className={`gif-emoji-tab ${gifTab === 'trending' ? 'active' : ''}`}
                                    onClick={() => setGifTab('trending')}
                                >
                                    À la une
                                </button>
                                <button
                                    className={`gif-emoji-tab ${gifTab === 'recent' ? 'active' : ''}`}
                                    onClick={() => setGifTab('recent')}
                                >
                                    Récents
                                </button>
                                <button
                                    className={`gif-emoji-tab ${gifTab === 'search' ? 'active' : ''}`}
                                    onClick={() => setGifTab('search')}
                                >
                                    Rechercher
                                </button>
                            </div>
                            {gifTab === 'search' && (
                                <input
                                    type="text"
                                    placeholder="Rechercher un GIF..."
                                    value={gifSearch}
                                    onChange={(e) => setGifSearch(e.target.value)}
                                    className="gif-search-input"
                                    style={{ marginTop: '8px' }}
                                />
                            )}
                            <div style={{ marginTop: '10px' }}>
                                {gifTab === 'recent' ? (
                                    <div className="gif-gallery">
                                        {recentGifs.length === 0 ? (
                                            <p style={{ textAlign: 'center', color: '#fff' }}>
                                                Aucun GIF récent
                                            </p>
                                        ) : (
                                            recentGifs.map((url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    alt="GIF récent"
                                                    onClick={() => handleGifSelect(url)}
                                                />
                                            ))
                                        )}
                                    </div>
                                ) : loadingGifs ? (
                                    <p style={{ textAlign: 'center', color: '#fff' }}>
                                        Chargement...
                                    </p>
                                ) : (
                                    <div className="gif-gallery">
                                        {gifResults.map((gif) => (
                                            <img
                                                key={gif.id}
                                                src={gif.images.fixed_width?.url || gif.images.original.url}
                                                alt={gif.title}
                                                onClick={() =>
                                                    handleGifSelect(gif.images.fixed_width?.url || gif.images.original.url)
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeMainTab === 'emoji' && (
                        <>
                            <div className="gif-emoji-tabs">
                                <button
                                    className={`gif-emoji-tab ${emojiSubTab === 'all' ? 'active' : ''}`}
                                    onClick={() => setEmojiSubTab('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`gif-emoji-tab ${emojiSubTab === 'recent' ? 'active' : ''}`}
                                    onClick={() => setEmojiSubTab('recent')}
                                >
                                    Récents
                                </button>
                                <button
                                    className={`gif-emoji-tab ${emojiSubTab === 'search' ? 'active' : ''}`}
                                    onClick={() => setEmojiSubTab('search')}
                                >
                                    Rechercher
                                </button>
                            </div>
                            {emojiSubTab === 'search' && (
                                <input
                                    type="text"
                                    placeholder="Rechercher un Emoji..."
                                    value={emojiSearch}
                                    onChange={(e) => setEmojiSearch(e.target.value)}
                                    className="gif-search-input"
                                    style={{ marginTop: '8px' }}
                                />
                            )}
                            <div className="emoji-gallery" style={{ marginTop: '10px', textAlign: 'center' }}>
                                {(
                                    emojiSubTab === 'recent'
                                        ? recentEmojis
                                        : emojiSubTab === 'search'
                                            ? emojiSearch.trim() === '' ? emojiListData : filteredEmojiList
                                            : emojiListData.length > 0 ? emojiListData : fallbackEmojiList
                                )
                                    .slice(0, 30)
                                    .map((item, idx) => {
                                        const displayEmoji =
                                            typeof item === 'object' ? item.character : item;
                                        return (
                                            <span
                                                key={idx}
                                                style={{ fontSize: '1.8rem', cursor: 'pointer', margin: '5px' }}
                                                onClick={() => handleEmojiSelect(displayEmoji)}
                                            >
                        {displayEmoji}
                      </span>
                                        );
                                    })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default MessageInput;
