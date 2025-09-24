// src/components/AnimeCard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import './styles.css';

const ALL_STATUSES = [
  { key: "watching", label: "Watching" },
  { key: "completed", label: "Completed" },
  { key: "on-hold", label: "On-Hold" },
  { key: "plan-to-watch", label: "Plan to Watch" },
  { key: "dropped", label: "Dropped" },
];

const AnimeCard = ({ anime, isDashboardCard = false, onUpdateProgress, onUpdateStatus, onDelete }) => {
  // --- State and Refs for Dashboard Card functionality ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [editableProgress, setEditableProgress] = useState(isDashboardCard ? anime.progress : 0);
  const menuRef = useRef(null);

  // --- State for Discovery Card functionality ---
  const { handleAddAnime } = useData();
  const [isAdding, setIsAdding] = useState(false);

  const handleDiscoveryAdd = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    // The Jikan API response for discovery pages needs to be adapted for our Firestore schema
    const animeDataForAdd = {
        mal_id: anime.mal_id,
        title: anime.title,
        images: anime.images,
        episodes: anime.episodes,
    };
    await handleAddAnime(animeDataForAdd, 'plan-to-watch');
    setIsAdding(false);
  };

  // --- All the logic from the old Dashboard AnimeCard ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const availableStatuses = isDashboardCard ? ALL_STATUSES.filter((s) => s.key !== anime.status) : [];
  const currentProgress = isDashboardCard ? parseInt(anime.progress, 10) || 0 : 0;
  const totalEpisodes = isDashboardCard ? parseInt(anime.total_episodes, 10) || 0 : parseInt(anime.episodes, 10) || 0;

  const handleIncrement = (e) => { e.stopPropagation(); if (totalEpisodes > 0 && currentProgress >= totalEpisodes) { toast("Already completed!"); return; } onUpdateProgress(anime.id, currentProgress + 1); };
  const handleDecrement = (e) => { e.stopPropagation(); if (currentProgress > 0) { onUpdateProgress(anime.id, currentProgress - 1); } };
  const handleSaveProgress = () => { const newProgress = parseInt(editableProgress, 10); if (!isNaN(newProgress)) { onUpdateProgress(anime.id, newProgress); } setIsEditingProgress(false); };
  const handleKeyDown = (e) => { if (e.key === "Enter") { handleSaveProgress(); } };
  const handleStatusChange = (e, newStatus) => { e.stopPropagation(); onUpdateStatus(anime.id, newStatus); setIsMenuOpen(false); };
  const handleDeleteClick = (e) => { e.stopPropagation(); toast((t) => (<span>Delete <b>{anime.title}</b>?<div style={{ display: "flex", gap: "8px", marginTop: '8px' }}><button className="toast-button-confirm" onClick={() => { onDelete(anime.id); toast.dismiss(t.id); }}>Confirm</button><button className="toast-button-cancel" onClick={() => toast.dismiss(t.id)}>Cancel</button></div></span>), { duration: 5000 }); setIsMenuOpen(false); };

  return (
    <Link to={`/anime/${anime.mal_id}`} className="anime-card-link">
      <div className="anime-card">
        {isDashboardCard && (
          <>
            <button className="options-menu-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}>...</button>
            {isMenuOpen && (
              <div className="options-dropdown" ref={menuRef}>
                {availableStatuses.map((status) => (<button key={status.key} className="menu-item" onClick={(e) => { e.preventDefault(); handleStatusChange(e, status.key); }}>Move to {status.label}</button>))}
                <button className="menu-item delete-item" onClick={(e) => { e.preventDefault(); handleDeleteClick(e); }}>Delete</button>
              </div>
            )}
          </>
        )}
        <img src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || anime.image} alt={anime.title} />
        <div className="anime-info">
          <p className="anime-title">{anime.title}</p>
          {isDashboardCard ? (
            <div className="progress-container">
              {(anime.status === "watching" || anime.status === "on-hold") ? ( isEditingProgress ? (<input type="number" className="progress-input" value={editableProgress} onChange={(e) => setEditableProgress(e.target.value)} onBlur={(e) => { e.preventDefault(); handleSaveProgress(); }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); handleKeyDown(e); }} onClick={(e) => e.preventDefault()} min="0" max={totalEpisodes > 0 ? totalEpisodes : undefined} autoFocus />) : (<p className="anime-progress progress-text" onClick={(e) => { e.preventDefault(); setEditableProgress(currentProgress); setIsEditingProgress(true); }}>{`${currentProgress} / ${totalEpisodes || "?"}`}</p>) ) : (<p className="anime-progress">{anime.status.replace(/-/g, " ")}</p>)}
              {(anime.status === "watching" || anime.status === "on-hold") && (<div className="progress-buttons-container"><button className="progress-increment-btn" onClick={(e) => { e.preventDefault(); handleDecrement(e); }}>-</button><button className="progress-increment-btn" onClick={(e) => { e.preventDefault(); handleIncrement(e); }}>+</button></div>)}
            </div>
          ) : (
            <button className="discovery-add-btn" onClick={handleDiscoveryAdd} disabled={isAdding}>
              {isAdding ? 'Adding...' : '＋ Plan to Watch'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default AnimeCard;