// Componant/Nav.js
import React from 'react';
import logoIcon from './img/logo/Logo.png';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const token    = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
        window.location.reload();
    };

    const isActive = (path) =>
        location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <nav className="nav">
            <Link to="/" className="nav__logo">
                <img src={logoIcon} alt="logo" className="nav__logo-img" />
                <span className="nav__logo-text">
                    ถูก<span className="nav__logo-accent">จริต</span>
                </span>
                <span className="nav__logo-dot" />
            </Link>

            <div className="nav__menu">
                <Link
                    to="/"
                    className={`nav__item${location.pathname === '/' ? ' nav__item--active' : ''}`}
                >
                    หน้าแรก
                </Link>
                <Link
                    to="/analysis"
                    className={`nav__item${isActive('/analysis') ? ' nav__item--active' : ''}`}
                >
                    ค้นหาอินฟูฯ
                </Link>
                {token && (
                    <Link
                        to="/favorites"
                        className={`nav__item${isActive('/favorites') ? ' nav__item--active' : ''}`}
                    >
                        ⭐ Favorites
                    </Link>
                )}
                {token ? (
                    <button className="nav__btn" onClick={handleLogout}>
                        ออกจากระบบ
                    </button>
                ) : (
                    <Link to="/login">
                        <button className="nav__btn">เข้าสู่ระบบ</button>
                    </Link>
                )}
            </div>
        </nav>
    );
}

export default Navbar;