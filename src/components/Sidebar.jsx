// src/components/Sidebar.jsx
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./styles.css";

// Accept setView as a prop
const Sidebar = ({ setView }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleNavClick = (e, viewName) => {
    e.preventDefault(); // Prevent the default anchor tag behavior
    setView(viewName);
  };

  return (
    <aside className="sidebar">
      <div>
        <div className="logo">ANIOTAKO</div>
        <nav>
          <ul className="nav-list">
            <li className="nav-item">
              <a href="#" onClick={(e) => handleNavClick(e, "dashboard")}>
                <span>🏠</span> Home
              </a>
            </li>
            <li className="nav-item">
              <a href="#">
                <span>🔥</span> Trending
              </a>
            </li>
            <li className="nav-item">
              <a href="#">
                <span>🗓️</span> Seasonal
              </a>
            </li>
          </ul>
          <ul className="nav-list" style={{ marginTop: "24px" }}>
            <li className="nav-item">
              <a href="#">
                <span>📚</span> My Library
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => handleNavClick(e, "add-anime")}>
                <span>➕</span> Add Anime
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <ul className="nav-list">
        <li className="nav-item">
          <a href="#" onClick={handleLogout}>
            <span>🚪</span> Log Out
          </a>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;