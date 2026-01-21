import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
// 👇 1. เพิ่มบรรทัดนี้: Import LoadingOverlay เข้ามา (เช็ค Path ให้ถูกนะครับว่าไฟล์อยู่ที่ไหน)
// สมมติว่าไฟล์ Search.js กับ LoadingOverlay.js อยู่ในโฟลเดอร์ components เหมือนกัน
import LoadingOverlay from "./LoadingOverlay"; 

function Search() {
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); 

    const handleSearch = async () => {
        if (!inputValue) return alert("กรุณาพิมพ์คำค้นหาก่อนครับ");

        setLoading(true); // 🟢 เริ่มหมุน Loading
        try {
            const response = await fetch('http://localhost:5000/api/search-tiktok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    keyword: inputValue,
                    limit: 5 
                }) 
            });

            if (!response.ok) throw new Error('Server error');

            const result = await response.json();
            console.log("ผลลัพธ์:", result);
            
            navigate('/analysis'); 

        } catch (error) {
            console.error("Error:", error);
            alert("เกิดข้อผิดพลาด หรือเครดิต Apify อาจหมด");
        } finally {
            setLoading(false); // 🔴 หยุดหมุน (แต่จริงๆ พอ navigate ไปแล้วหน้านี้จะหายไปเอง)
        }
    };

    return (
        <div className="hero-section">
            {/* 👇 2. เพิ่มบรรทัดนี้: วาง LoadingOverlay ไว้ตรงนี้ เพื่อให้มันลอยทับทุกอย่าง */}
            <LoadingOverlay isLoading={loading} />

            <h1>
                หาคนที่ <span className="highlight">#ถูกจริต & </span> <br />
                เพื่อธุรกิจที่ <span className="highlight">ปังกว่า</span>
            </h1>

            <div className="search-box-container">
                <i className="fi fi-br-search search-icon"></i>
                
                <input 
                    type="text" 
                    placeholder="พิมพ์ #hashtag หรือ @username เพื่อค้นหา..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                
                {/* ปุ่มค้นหา (จะ disable ตอนโหลดเพื่อกันคนกดย้ำ) */}
                <button className="analyze-btn" onClick={handleSearch} disabled={loading}>
                    {loading ? "..." : "ค้นหา"}
                </button>
            </div>

            <p className="hero-subtitle">
                ให้ <b>ถูกจริต</b> ช่วยคุณ
            </p>
        </div>
    );
}

export default Search;