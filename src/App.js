import React, { useEffect } from 'react';
import './App.css';
import '@flaticon/flaticon-uicons/css/all/all.css';
import AOS from 'aos';
import 'aos/dist/aos.css';
// 1. นำเข้าของสำหรับทำ Router
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// นำเข้า Component ต่างๆ
import Navbar from './Componant/Nav';
import Search from './Componant/Search';     // หน้าแรก (ส่วนค้นหา)
import HowItWorks from './Componant/HowItWorks'; // หน้าแรก (ส่วนวิธีใช้)
import Analysis from './Componant/Analysis'; // หน้าผลลัพธ์ (ที่คุณเพิ่งทำ)

function App() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
    });
  }, []);

  return (
    <Router> {/* ครอบทุกอย่างด้วย Router */}
      <div className="App">
        <Navbar /> {/* Navbar อยู่นอก Routes จะได้โชว์ตลอดเวลา */}
        
        <Routes>
          {/* --- เส้นทางที่ 1: หน้าแรก (Home) --- */}
          {/* ในหน้าแรก เราอยากโชว์ทั้ง Search และ HowItWorks ต่อกัน */}
          <Route path="/" element={
            <>
              <Search />
              <HowItWorks />
            </>
          } />

          {/* --- เส้นทางที่ 2: หน้าวิเคราะห์ (Analysis) --- */}
          <Route path="/analysis" element={<Analysis />} />
        </Routes>
        
      </div>
    </Router>
    
  );
}

export default App;