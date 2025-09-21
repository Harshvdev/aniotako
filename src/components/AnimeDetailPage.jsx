// src/components/AnimeDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './styles.css'; // We will add styles to this file later

const AnimeDetailPage = () => {
  const { id } = useParams(); // Gets the ':id' from the URL
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnimeDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
        if (!response.ok) {
          throw new Error('Failed to fetch anime details. It might not exist.');
        }
        const data = await response.json();
        setAnime(data.data);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching anime details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnimeDetails();
  }, [id]); // Re-run this effect if the ID in the URL changes

  if (loading) {
    return <div className="detail-page-container"><h2>Loading details...</h2></div>;
  }

  if (error) {
    return <div className="detail-page-container"><h2>Error: {error}</h2></div>;
  }

  if (!anime) {
    return <div className="detail-page-container"><h2>No anime data found.</h2></div>;
  }

  return (
    <div className="detail-page-container">
      <div className="detail-page-header">
        <Link to="/" className="back-button">← Back to Dashboard</Link>
        <h1>{anime.title_english || anime.title}</h1>
      </div>
      <div className="detail-content">
        <div className="detail-left">
          <img src={anime.images.jpg.large_image_url} alt={anime.title} />
        </div>
        <div className="detail-right">
          <div className="detail-meta">
            <span><strong>Type:</strong> {anime.type}</span>
            <span><strong>Episodes:</strong> {anime.episodes || 'N/A'}</span>
            <span><strong>Status:</strong> {anime.status}</span>
            <span><strong>Score:</strong> {anime.score ? `${anime.score} ⭐` : 'N/A'}</span>
          </div>
          <div className="detail-genres">
            {anime.genres.map(genre => <span key={genre.mal_id} className="genre-tag">{genre.name}</span>)}
          </div>
          <h2>Synopsis</h2>
          <p className="synopsis">{anime.synopsis || 'No synopsis available.'}</p>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetailPage;