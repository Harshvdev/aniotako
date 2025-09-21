// src/context/DataContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, doc, writeBatch, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { toast } from 'react-hot-toast';

const DataContext = createContext();

export const useData = () => {
  return useContext(DataContext);
};

export const DataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [animeList, setAnimeList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  // Effect for handling user authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching the user's anime list in real-time
  useEffect(() => {
    if (!user) {
      setAnimeList([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    const animeCollectionRef = collection(db, 'users', user.uid, 'anime');
    const q = query(animeCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const list = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAnimeList(list);
        setListLoading(false);
      },
      (error) => {
        console.error('Firestore snapshot error:', error);
        setListLoading(false);
        toast.error('Could not load your library.');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- Firestore Data Manipulation Functions ---

  const handleAddAnime = async (anime, status = 'plan-to-watch') => {
    if (!user) {
      toast.error('You must be logged in.');
      return Promise.reject(new Error('User not logged in.'));
    }

    const isAlreadyAdded = animeList.some((item) => item.mal_id === anime.mal_id);
    if (isAlreadyAdded) {
      toast.error(`'${anime.title}' is already in your list.`);
      return Promise.reject(new Error('Anime already in list.'));
    }

    try {
      const batch = writeBatch(db);
      const newAnimeData = {
        mal_id: anime.mal_id,
        title: anime.title,
        image: anime.images.jpg.image_url,
        status: status,
        progress: 0,
        total_episodes: anime.episodes || 'N/A',
        createdAt: serverTimestamp(),
      };

      const newAnimeRef = doc(collection(db, 'users', user.uid, 'anime'));
      batch.set(newAnimeRef, newAnimeData);

      const userDocRef = doc(db, 'users', user.uid);
      batch.update(userDocRef, { lastAnimeAddedAt: serverTimestamp() });

      await batch.commit();
      toast.success(`'${anime.title}' added to your list!`);
    } catch (error) {
      console.error('Error adding anime:', error);
      toast.error('Failed to add anime.');
      return Promise.reject(error);
    }
  };

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


  const value = {
    user,
    authLoading,
    animeList,
    listLoading,
    handleAddAnime,
    handleUpdateProgress,
    handleUpdateStatus,
    handleDeleteAnime,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};