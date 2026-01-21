import React from 'react';
import './Header.css';

interface HeaderProps {
  userName?: string;
  userInitials?: string;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  userName = 'Tobias Schmidt',
  userInitials = 'TS',
  onLogout,
}) => {
  return (
    <div className="header">
      <div className="header-left">
        <div className="logo">DS</div>
        <h1>RA CMC-GPT</h1>
      </div>
      <div className="user-info">
        <div>
          <span className="user-name">{userName}</span>
          <br />
          <a href="#" className="logout-link" onClick={onLogout}>
            Logout
          </a>
        </div>
        <div className="user-avatar">{userInitials}</div>
      </div>
    </div>
  );
};

export default Header;
