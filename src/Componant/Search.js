import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 1. นำเข้า useNavigate

function Search() {
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // 2. ประกาศตัวแปร navigate

    const handleSearch = async () => {
        if (!inputValue) return alert("กรุณาพิมพ์คำค้นหาก่อนครับ");

        setLoading(true);
        try {
            // 3. ยิงไปที่ URL ให้ถูก (/api/search-tiktok)
            const response = await fetch('http://localhost:5000/api/search-tiktok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 4. เปลี่ยนชื่อตัวแปรเป็น 'keyword' ให้ตรงกับ Server
                body: JSON.stringify({ 
                    keyword: inputValue,
                    limit: 5 // ส่งจำนวนที่อยากได้ไปด้วย
                }) 
            });

            if (!response.ok) throw new Error('Server error');

            const result = await response.json();
            console.log("ผลลัพธ์:", result);
            
            // 5. ค้นหาเสร็จแล้ว เปลี่ยนไปหน้ากราฟทันที
            navigate('/analysis'); 

        } catch (error) {
            console.error("Error:", error);
            alert("เกิดข้อผิดพลาด หรือเครดิต Apify อาจหมด");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hero-section">
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
                
                <button className="analyze-btn" onClick={handleSearch} disabled={loading}>
                    {loading ? "กำลังวิเคราะห์..." : "ค้นหา"}
                </button>
            </div>

            <p className="hero-subtitle">
                ให้ <b>ถูกจริต</b> ช่วยคุณ
            </p>
        </div>
    );
}

export default Search;