import React from 'react';

function HowItWorks() {
  return (
    <div className="how-it-works-section">
      {/* ส่วนหัวข้อ */}
      <div className="section-header" data-aos="fade-up">
        <h2>อะไรคือ <span className="highlight">#ถูกจริต ??</span></h2>
        <p className="section-subtitle">
          ในวันที่โลกไม่เคยหยุดนิ่ง ธุรกิจต้องวิ่งให้ทัน #ถูกจริต พร้อมเชื่อมต่อแบรนด์ของคุณสู่โอกาสใหม่ ให้ 'ธุรกิจของคุณ' เติบโตได้ไกลระดับโลก
        </p>
      </div>

      {/* ส่วนการ์ด 3 ใบ */}
      <div className="features-grid">
        
        {/* Card 1 */}
        <div className="feature-card" data-aos="fade-up" data-aos-delay="100">
          <div className="icon-box blue-icon">
            <i className="fi fi-br-search"></i>
          </div>
          <div className="step-label">Step 01</div>
          <h3>Search & Match</h3>
          <p>พิมพ์คีย์เวิร์ดสินค้าหรือสไตล์ที่คุณหา ระบบ AI จะคัดกรอง Influencer ที่ "ถูกจริต" กับแบรนด์ของคุณมาให้ทันที</p>
        </div>

        {/* Card 2 */}
        <div className="feature-card" data-aos="fade-up" data-aos-delay="200">
          <div className="icon-box purple-icon">
            <i className="fi fi-br-network-cloud"></i> {/* เปลี่ยนไอคอนเป็นกราฟ/เครือข่าย */}
          </div>
          <div className="step-label">Step 02</div>
          <h3>Analyze The Graph</h3>
          <p>ดูความถนัดผ่าน Graph Visualization <b>"ยิ่งเส้นกราฟหนา ยิ่งเชี่ยวชาญ"</b> ช่วยให้คุณตัดสินใจเลือกคนที่มีอิทธิพลต่อลูกค้าจริง</p>
        </div>

        {/* Card 3 */}
        <div className="feature-card" data-aos="fade-up" data-aos-delay="300">
          <div className="icon-box green-icon">
            <i className="fi fi-br-paper-plane"></i> {/* เปลี่ยนไอคอนเป็นส่งข้อความ/จรวด */}
          </div>
          <div className="step-label">Step 03</div>
          <h3>Connect & Grow</h3>
          <p>เจอคนที่ใช่แล้ว? กดดู Contact เพื่อติดต่องาน หรือโพสต์แคมเปญของคุณเพื่อให้ Influencer เข้ามาสมัครได้เลย</p>
        </div>

      </div>
    </div>
  );
}

export default HowItWorks;