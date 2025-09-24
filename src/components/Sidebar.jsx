// src/components/Sidebar.jsx
import React from "react";
import { signOut } from "firebase/auth";
import { NavLink } from "react-router-dom"; // <-- IMPORT NavLink
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

  const closeSidebar = () => {
    if (onClose) {
      onClose();
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
              <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""} onClick={closeSidebar} end>
                <span>🏠</span> Home
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/trending" className={({ isActive }) => isActive ? "active" : ""} onClick={closeSidebar}>
                <span>🔥</span> Trending
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/seasonal" className={({ isActive }) => isActive ? "active" : ""} onClick={closeSidebar}>
                <span>🗓️</span> Seasonal
              </NavLink>
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