// src/App.jsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, onSnapshot, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { Toaster, toast } from "react-hot-toast";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./components/Dashboard";
import AuthPage from "./components/AuthPage";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [animeList, setAnimeList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setAnimeList([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    const animeCollectionRef = collection(db, "users", user.uid, "anime");
    const q = query(animeCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAnimeList(list);
      setListLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setListLoading(false);
      toast.error("Could not load your library.");
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddAnime = async (anime, status = "plan-to-watch") => {
    if (!user) return toast.error("You must be logged in.");

    const isAlreadyAdded = animeList.some((item) => item.mal_id === anime.mal_id);
    if (isAlreadyAdded) {
      return toast.error(`'${anime.title}' is already in your list.`);
    }

    try {
      const batch = writeBatch(db);
      const newAnimeData = {
        mal_id: anime.mal_id,
        title: anime.title,
        image: anime.images.jpg.image_url,
        status: status,
        progress: 0,
        total_episodes: anime.episodes || "N/A",
        createdAt: serverTimestamp(),
      };

      const newAnimeRef = doc(collection(db, "users", user.uid, "anime"));
      batch.set(newAnimeRef, newAnimeData);

      const userDocRef = doc(db, "users", user.uid);
      batch.update(userDocRef, { lastAnimeAddedAt: serverTimestamp() });

      await batch.commit();
      toast.success(`'${anime.title}' added to your list!`);
    } catch (error) {
      console.error("Error adding anime:", error);
      toast.error("Failed to add anime.");
    }
  };

  if (authLoading) {
    return <div>Authenticating...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app-container">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#242424",
            color: "var(--text-primary)",
            border: "1px solid var(--bg-tertiary)",
          },
        }}
      />
      <Sidebar />
      <main className="main-content">
        <TopBar user={user} onAddAnime={handleAddAnime} />
        <Dashboard
          user={user}
          animeList={animeList}
          isLoading={listLoading}
        />
      </main>
    </div>
  );
}

export default App;