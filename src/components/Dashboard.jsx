// src/components/Dashboard.jsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-hot-toast";
import "./styles.css";

// Moved outside the component to prevent re-creation on every render.
const ALL_STATUSES = [
  { key: "watching", label: "Watching" },
  { key: "completed", label: "Completed" },
  { key: "on-hold", label: "On-Hold" },
  { key: "plan-to-watch", label: "Plan to Watch" },
  { key: "dropped", label: "Dropped" },
];

const AnimeCard = ({ anime, onUpdateProgress, onUpdateStatus, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [editableProgress, setEditableProgress] = useState(anime.progress);
  const menuRef = useRef(null);

  const availableStatuses = ALL_STATUSES.filter((s) => s.key !== anime.status);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const currentProgress = parseInt(anime.progress, 10) || 0;
  const totalEpisodes = parseInt(anime.total_episodes, 10) || 0;

  const handleIncrement = (e) => {
    e.stopPropagation();
    // Added client-side check to prevent incrementing past the total.
    if (totalEpisodes > 0 && currentProgress >= totalEpisodes) {
      toast("Already completed!");
      return;
    }
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
    if (e.key === "Enter") {
      handleSaveProgress();
    }
  };

  const handleStatusChange = (e, newStatus) => {
    e.stopPropagation();
    onUpdateStatus(anime.id, newStatus);
    setIsMenuOpen(false);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    toast(
      (t) => (
        <span style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          Delete <b>{anime.title}</b>?
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="toast-button-confirm"
              onClick={() => {
                onDelete(anime.id);
                toast.dismiss(t.id);
              }}
            >
              Confirm
            </button>
            <button className="toast-button-cancel" onClick={() => toast.dismiss(t.id)}>
              Cancel
            </button>
          </div>
        </span>
      ),
      { duration: 5000 }
    );
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
            onClick={handleDeleteClick}
          >
            Delete
          </button>
        </div>
      )}

      <img src={anime.image} alt={anime.title} />
      <div className="anime-info">
        <p className="anime-title">{anime.title}</p>
        <div className="progress-container">
          {(anime.status === "watching" || anime.status === "on-hold") ? (
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
            <p className="anime-progress">
              {anime.status.replace(/-/g, " ")}
            </p>
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

const Dashboard = ({ user, animeList, isLoading }) => {
  const handleUpdateProgress = async (docId, newProgress) => {
    const anime = animeList.find((a) => a.id === docId);
    if (!anime) return;
    const totalEpisodes = parseInt(anime.total_episodes, 10) || Infinity;
    const validatedProgress = parseInt(newProgress, 10);
    if (isNaN(validatedProgress) || validatedProgress < 0) return;
    if (validatedProgress > totalEpisodes) {
      toast.error(`Progress cannot exceed ${totalEpisodes} episodes.`);
      return;
    }
    const animeDocRef = doc(db, "users", user.uid, "anime", docId);
    await updateDoc(animeDocRef, { progress: validatedProgress });
    toast.success("Progress updated!");
  };

  const handleUpdateStatus = async (docId, newStatus) => {
    const animeDocRef = doc(db, "users", user.uid, "anime", docId);
    const anime = animeList.find((a) => a.id === docId);
    if (!anime) return;
    const updateData = { status: newStatus };
    if (newStatus === "completed" && anime.total_episodes) {
      updateData.progress = parseInt(anime.total_episodes, 10);
    }
    if (newStatus === "watching" && anime.status !== "watching") {
      updateData.progress = 0;
    }
    await updateDoc(animeDocRef, updateData);
    toast.success(`Moved to ${newStatus.replace("-", " ")}!`);
  };

  const handleDeleteAnime = async (docId) => {
    const animeDocRef = doc(db, "users", user.uid, "anime", docId);
    await deleteDoc(animeDocRef);
    toast.error("Anime removed from your list.");
  };
  
  // Use useMemo to prevent re-filtering the list on every render.
  const watchingAnime = useMemo(() => animeList.filter((a) => a.status === "watching"), [animeList]);
  const planToWatchAnime = useMemo(() => animeList.filter((a) => a.status === "plan-to-watch"), [animeList]);
  const completedAnime = useMemo(() => animeList.filter((a) => a.status === "completed"), [animeList]);
  const onHoldAnime = useMemo(() => animeList.filter((a) => a.status === "on-hold"), [animeList]);
  const droppedAnime = useMemo(() => animeList.filter((a) => a.status === "dropped"), [animeList]);


  if (isLoading) {
    return (
      <div className="dashboard-content">
        <h2>Loading your library...</h2>
      </div>
    );
  }

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