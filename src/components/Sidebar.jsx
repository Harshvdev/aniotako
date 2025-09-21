// src/components/Sidebar.jsx
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./styles.css";

const Sidebar = ({ isOpen, onClose }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div>
        <div className="sidebar-header">
          <div className="logo">ANIOTAKO</div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <nav>
          <ul className="nav-list">
            <li className="nav-item">
              <a href="#" className="active">
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
            <li className="nav-item">
              <a href="#">
                <span>📚</span> My Library
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <ul className="nav-list">
        <li className="nav-item">
          <button className="nav-button" onClick={handleLogout}>
            <span>🚪</span> Log Out
          </button>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;