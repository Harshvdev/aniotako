// src/components/Dashboard.jsx
import React, { useMemo } from "react";
import { useData } from "../context/DataContext";
import AnimeCard from './AnimeCard'; // <-- IMPORT THE REUSABLE COMPONENT
import "./styles.css";

const Dashboard = () => {
  const { 
    animeList, 
    listLoading, 
    handleUpdateProgress, 
    handleUpdateStatus, 
    handleDeleteAnime 
  } = useData();
  
  const watchingAnime = useMemo(() => animeList.filter((a) => a.status === "watching"), [animeList]);
  const planToWatchAnime = useMemo(() => animeList.filter((a) => a.status === "plan-to-watch"), [animeList]);
  const completedAnime = useMemo(() => animeList.filter((a) => a.status === "completed"), [animeList]);
  const onHoldAnime = useMemo(() => animeList.filter((a) => a.status === "on-hold"), [animeList]);
  const droppedAnime = useMemo(() => animeList.filter((a) => a.status === "dropped"), [animeList]);

  if (listLoading) {
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
              isDashboardCard={true} // <-- TELL THE CARD TO BE INTERACTIVE
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