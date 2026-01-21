import React from "react";
import { Link } from 'react-router-dom'; // 1. นำเข้า Link
import '@flaticon/flaticon-uicons/css/all/all.css';
import logoIcon from './img/logo/Logo.png'; // เช็ค path รูปดีๆ นะครับ

function Navbar() {
    return (
        <div className="container">
            <nav className="navbar">
                <div className="logo">
                    {/* กด Logo แล้วกลับหน้าแรก */}
                    <Link to="/" className="logo-link"> 
                        <img src={logoIcon} alt="logo" className="logo-img" />
                        <span>ถูกจริต</span>
                    </Link>
                </div>

                <div className="menu">
                    {/* 2. เปลี่ยน span เป็น Link และใส่ to="..." */}
                    <Link to="/">หน้าแรก</Link>
                    
                    {/* สมมติว่ากดตรงนี้แล้วไปหน้ากราฟ */}
                    <Link to="/analysis">ค้นหาอินฟูฯ</Link> 
                    
                    <button className="contact-btn">เข้าสู่ระบบ</button>
                </div>
            </nav>
        </div>
    );
}

export default Navbar;