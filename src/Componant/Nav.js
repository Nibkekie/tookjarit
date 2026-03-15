// Componant/Nav.js — เพิ่มเมนู Jobboard
import React from 'react';
import logoIcon from './img/logo/Logo.png';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
    const navigate  = useNavigate();
    const location  = useLocation();
    const token     = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
        window.location.reload();
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <nav style={styles.nav}>
            {/* Logo */}
            <Link to="/" style={styles.logoLink}>
                <img src={logoIcon} alt="logo" style={styles.logoImg} />
                <span style={styles.logoText}>ถูก<span style={styles.logoAccent}>จริต</span></span>
                <span style={styles.logoDot}></span>
            </Link>

            {/* Menu */}
            <div style={styles.menu}>
                <Link to="/" style={{ ...styles.navItem, ...(isActive('/') && location.pathname === '/' ? styles.navItemActive : {}) }}>
                    หน้าแรก
                </Link>
                <Link to="/analysis" style={{ ...styles.navItem, ...(isActive('/analysis') ? styles.navItemActive : {}) }}>
                    ค้นหาอินฟูฯ
                </Link>

                {/* ── NEW: Jobboard ── */}
                <Link to="/jobboard" style={{ ...styles.navItem, ...(isActive('/jobboard') ? styles.navItemActive : {}) }}>
                    📋 Jobboard
                </Link>

                {token && (
                    <Link to="/favorites" style={{ ...styles.navItem, ...(isActive('/favorites') ? styles.navItemActive : {}) }}>
                        ⭐ Favorites
                    </Link>
                )}
                {token ? (
                    <button style={styles.navBtn} onClick={handleLogout}>ออกจากระบบ</button>
                ) : (
                    <Link to="/login">
                        <button style={styles.navBtn}>เข้าสู่ระบบ</button>
                    </Link>
                )}
            </div>
        </nav>
    );
}

const styles = {
    nav: {
        position: 'sticky',
        top: 0,
        zIndex: 200,
        background: '#1a1a2e',
        height: '64px',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
        fontFamily: "'Prompt', sans-serif",
    },
    logoLink: { display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' },
    logoImg: { height: '32px', width: '32px', objectFit: 'contain' },
    logoText: { fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' },
    logoAccent: { color: '#FF4757' },
    logoDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#FF4757', animation: 'pulse 2s infinite' },
    menu: { display: 'flex', alignItems: 'center', gap: '4px' },
    navItem: {
        padding: '8px 16px', borderRadius: '999px',
        color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
        fontSize: '14px', fontWeight: '500', transition: 'all 0.2s',
        fontFamily: "'Prompt', sans-serif",
    },
    navItemActive: { background: '#FF4757', color: '#fff' },
    navBtn: {
        marginLeft: '8px', padding: '8px 20px',
        background: 'linear-gradient(135deg, #FF4757, #ff6b81)',
        color: '#fff', border: 'none', borderRadius: '999px',
        cursor: 'pointer', fontSize: '14px', fontWeight: '600',
        fontFamily: "'Prompt', sans-serif", transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(255,71,87,0.4)',
    },
};

export default Navbar;
