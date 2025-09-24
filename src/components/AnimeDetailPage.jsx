// src/components/AnimeDetailPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import './styles.css';

const DetailPageActions = ({ animeInList, jikanAnime }) => {
  const { handleAddAnime, handleUpdateStatus, handleDeleteAnime } = useData();
  const [adding, setAdding] = useState(false);

  const handleAddClick = async () => {
    setAdding(true);
    await handleAddAnime(jikanAnime);
    setAdding(false);
  };
  
  if (animeInList) {
    return (
      <div className="detail-actions in-list">
        <h4>In Your Library</h4>
        <div className="action-controls">
          <select 
            className="status-select" 
            value={animeInList.status}
            onChange={(e) => handleUpdateStatus(animeInList.id, e.target.value)}
          >
            <option value="watching">Watching</option>
            <option value="plan-to-watch">Plan to Watch</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On-Hold</option>
            <option value="dropped">Dropped</option>
          </select>
          <button className="delete-button" onClick={() => handleDeleteAnime(animeInList.id)}>
            Remove
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="detail-actions">
        <button className="add-to-list-btn" onClick={handleAddClick} disabled={adding}>
          {adding ? 'Adding...' : '＋ Add to List'}
        </button>
      </div>
    );
  }
};

const AnimeDetailPage = () => {
  const { id } = useParams();
  const { animeList } = useData();
  const [jikanAnime, setJikanAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const animeInList = useMemo(() => {
    const numericId = parseInt(id, 10);
    return animeList.find(item => item.mal_id === numericId);
  }, [animeList, id]);

  useEffect(() => {
    const fetchAnimeDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
        if (!response.ok) throw new Error('Failed to fetch anime details.');
        const data = await response.json();
        setJikanAnime(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnimeDetails();
  }, [id]);

  if (loading) {
    return <div className="detail-page-container"><h2>Loading details...</h2></div>;
  }
  if (error) {
    return <div className="detail-page-container"><h2>Error: {error}</h2></div>;
  }
  if (!jikanAnime) {
    return <div className="detail-page-container"><h2>No anime data found.</h2></div>;
  }

  return (
    <div className="detail-page-container">
      <div className="detail-page-header">
        <Link to="/" className="back-button">← Back to Dashboard</Link>
        <h1>{jikanAnime.title_english || jikanAnime.title}</h1>
      </div>

      {/* === THIS IS THE NEW, CORRECT STRUCTURE === */}
      <div className="detail-content">
        {/* --- LEFT COLUMN: Image and Genres --- */}
        <div className="detail-left">
          <img src={jikanAnime.images.jpg.large_image_url} alt={jikanAnime.title} />
          <div className="detail-genres">
            {jikanAnime.genres.map(genre => <span key={genre.mal_id} className="genre-tag">{genre.name}</span>)}
          </div>
        </div>

        {/* --- RIGHT COLUMN: Meta, Synopsis, and Actions --- */}
        <div className="detail-right">
          <div className="detail-meta">
            <span><strong>Type:</strong> {jikanAnime.type}</span>
            <span><strong>Episodes:</strong> {jikanAnime.episodes || 'N/A'}</span>
            <span><strong>Status:</strong> {jikanAnime.status}</span>
            <span><strong>Score:</strong> {jikanAnime.score ? `${jikanAnime.score} ⭐` : 'N/A'}</span>
          </div>
          <h2>Synopsis</h2>
          <p className="synopsis">{jikanAnime.synopsis || 'No synopsis available.'}</p>
          <DetailPageActions animeInList={animeInList} jikanAnime={jikanAnime} />
        </div>
      </div>
    </div>
  );
};

export default AnimeDetailPage;