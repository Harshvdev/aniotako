// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./styles.css";

// --- Fully Dynamic & Interactive AnimeCard Component ---
const AnimeCard = ({
  anime,
  onUpdateProgress,
  onUpdateStatus,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [editableProgress, setEditableProgress] = useState(anime.progress);
  const menuRef = useRef(null);

  const ALL_STATUSES = [
    { key: "watching", label: "Watching" },
    { key: "completed", label: "Completed" },
    { key: "on-hold", label: "On-Hold" },
    { key: "plan-to-watch", label: "Plan to Watch" },
    { key: "dropped", label: "Dropped" },
  ];

  // Dynamically generate menu options based on current status
  const availableStatuses = ALL_STATUSES.filter(
    (status) => status.key !== anime.status
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const currentProgress = parseInt(anime.progress, 10) || 0;
  const totalEpisodes = parseInt(anime.total_episodes, 10) || 0;

  const handleIncrement = (e) => {
    e.stopPropagation();
    onUpdateProgress(anime.id, currentProgress + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (currentProgress > 0) {
      onUpdateProgress(anime.id, currentProgress - 1);
    }
  };

  const handleSaveProgress = () => {
    const newProgress = parseInt(editableProgress, 10);
    if (!isNaN(newProgress)) {
      onUpdateProgress(anime.id, newProgress);
    }
    setIsEditingProgress(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSaveProgress();
  };

  const handleStatusChange = (e, newStatus) => {
    e.stopPropagation();
    onUpdateStatus(anime.id, newStatus);
    setIsMenuOpen(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${anime.title}"?`)) {
      onDelete(anime.id);
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="anime-card">
      <button
        className="options-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
      >
        ...
      </button>

      {isMenuOpen && (
        <div className="options-dropdown" ref={menuRef}>
          {availableStatuses.map((status) => (
            <button
              key={status.key}
              className="menu-item"
              onClick={(e) => handleStatusChange(e, status.key)}
            >
              Move to {status.label}
            </button>
          ))}
          <button
            className="menu-item delete-item"
            onClick={(e) => handleDelete(e)}
          >
            Delete
          </button>
        </div>
      )}

      <img src={anime.image} alt={anime.title} />
      <div className="anime-info">
        <p className="anime-title">{anime.title}</p>
        <div className="progress-container">
          {anime.status === "watching" || anime.status === "on-hold" ? ( // Also show progress for on-hold
            isEditingProgress ? (
              <input
                type="number"
                className="progress-input"
                value={editableProgress}
                onChange={(e) => setEditableProgress(e.target.value)}
                onBlur={handleSaveProgress}
                onKeyDown={handleKeyDown}
                min="0"
                max={totalEpisodes > 0 ? totalEpisodes : undefined}
                autoFocus
              />
            ) : (
              <p
                className="anime-progress progress-text"
                onClick={() => {
                  setEditableProgress(currentProgress);
                  setIsEditingProgress(true);
                }}
              >
                {`${currentProgress} / ${totalEpisodes || "?"}`}
              </p>
            )
          ) : (
            <p className="anime-progress">{anime.status.replace(/-/g, " ")}</p>
          )}
          {(anime.status === "watching" || anime.status === "on-hold") && (
            <div className="progress-buttons-container">
              <button className="progress-increment-btn" onClick={handleDecrement}>-</button>
              <button className="progress-increment-btn" onClick={handleIncrement}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ user, animeList, isLoading }) => {
  const handleUpdateProgress = async (docId, newProgress) => {
    // ... (This function remains unchanged)
    const anime = animeList.find((a) => a.id === docId);
    if (!anime) return;
    const totalEpisodes = parseInt(anime.total_episodes, 10) || Infinity;
    const validatedProgress = parseInt(newProgress, 10);
    if (isNaN(validatedProgress) || validatedProgress < 0) return;
    if (validatedProgress > totalEpisodes) return;
    const animeDocRef = doc(db, "users", user.uid, "anime", docId);
    await updateDoc(animeDocRef, { progress: validatedProgress });
  };

  const handleUpdateStatus = async (docId, newStatus) => {
    const animeDocRef = doc(db, "users", user.uid, "anime", docId);
    const anime = animeList.find((a) => a.id === docId);
    if (!anime) return;

    const updateData = { status: newStatus };

    // If moving to completed, set progress to max
    if (newStatus === "completed" && anime.total_episodes) {
      updateData.progress = parseInt(anime.total_episodes, 10);
    }
    // If moving to watching, reset progress
    if (newStatus === "watching" && anime.status !== "watching") {
      updateData.progress = 0;
    }

    await updateDoc(animeDocRef, updateData);
  };

  const handleDeleteAnime = async (docId) => {
    // ... (This function remains unchanged)
    const animeDocRef = doc(db, "users", user.uid, "anime", docId);
    await deleteDoc(animeDocRef);
  };

  // Filter into all five lists
  const watchingAnime = animeList.filter((a) => a.status === "watching");
  const planToWatchAnime = animeList.filter((a) => a.status === "plan-to-watch");
  const completedAnime = animeList.filter((a) => a.status === "completed");
  const onHoldAnime = animeList.filter((a) => a.status === "on-hold");
  const droppedAnime = animeList.filter((a) => a.status === "dropped");

  const renderAnimeList = (list, title) => (
    <section className="anime-list-section">
      <h2>{title}</h2>
      {list.length > 0 ? (
        <div className="anime-grid">
          {list.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              onUpdateProgress={handleUpdateProgress}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDeleteAnime}
            />
          ))}
        </div>
      ) : (
        <p>No anime in this list yet.</p>
      )}
    </section>
  );

  if (isLoading) {
    return (
      <div className="dashboard-content">
        <h2>Loading your lists...</h2>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {renderAnimeList(watchingAnime, "▶️ Currently Watching")}
      {renderAnimeList(planToWatchAnime, "🗓️ Plan to Watch")}
      {renderAnimeList(completedAnime, "✅ Completed")}
      {renderAnimeList(onHoldAnime, "⏸️ On-Hold")}
      {renderAnimeList(droppedAnime, "🗑️ Dropped")}
    </div>
  );
};

export default Dashboard;