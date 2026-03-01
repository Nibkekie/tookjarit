import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return alert('กรุณากรอกข้อมูลให้ครบ');
        setLoading(true);
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const body = isLogin ? { email, password } : { name, email, password };
            const res = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
            localStorage.setItem('token', data.token);
            navigate('/');
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            {/* ฝั่งซ้าย - Form */}
            <div style={styles.formSide}>
                <div style={styles.formInner}>
                    <h2 style={styles.formTitle}>
                        {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                    </h2>
                    <p style={styles.formSub}>
                        {isLogin ? 'ยินดีต้อนรับกลับมา!' : 'เริ่มต้นหา Influencer ที่ใช่วันนี้'}
                    </p>

                    {/* Social Login */}
                    <div style={styles.socialRow}>
                        {['G', 'f', 'in'].map((s) => (
                            <button key={s} style={styles.socialBtn}>{s}</button>
                        ))}
                    </div>
                    <div style={styles.divider}><span style={styles.dividerText}>หรือใช้อีเมล</span></div>

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>ชื่อ</label>
                                <input
                                    type="text"
                                    placeholder="ชื่อของคุณ"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={styles.input}
                                    onFocus={e => e.target.style.borderColor = '#ff4757'}
                                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                                />
                            </div>
                        )}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>อีเมล</label>
                            <input
                                type="email"
                                placeholder="example@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={styles.input}
                                onFocus={e => e.target.style.borderColor = '#ff4757'}
                                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>รหัสผ่าน</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={styles.input}
                                onFocus={e => e.target.style.borderColor = '#ff4757'}
                                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>
                        {isLogin && (
                            <p style={styles.forgot}>ลืมรหัสผ่าน?</p>
                        )}
                        <button type="submit" style={styles.submitBtn} disabled={loading}>
                            {loading ? '...' : isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                        </button>
                    </form>

                    <p style={styles.switchText}>
                        {isLogin ? 'ยังไม่มีบัญชี?' : 'มีบัญชีแล้ว?'}{' '}
                        <span
                            style={styles.switchLink}
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'สมัครเลย' : 'เข้าสู่ระบบ'}
                        </span>
                    </p>
                </div>
            </div>

            {/* ฝั่งขวา - Panel */}
            <div style={styles.panelSide}>
                <div style={styles.panelContent}>
                    <div style={styles.panelEmoji}>✨</div>
                    <h2 style={styles.panelTitle}>
                        {isLogin ? 'สวัสดี, เพื่อน!' : 'ยินดีต้อนรับ!'}
                    </h2>
                    <p style={styles.panelSub}>
                        {isLogin
                            ? 'ยังไม่มีบัญชี? สมัครเพื่อเข้าถึง Influencer ที่ #ถูกจริต กับแบรนด์ของคุณ'
                            : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบเพื่อเริ่มใช้งานได้เลย'}
                    </p>
                    <button
                        style={styles.panelBtn}
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                    </button>
                </div>
                {/* Decorative blobs */}
                <div style={styles.blob1} />
                <div style={styles.blob2} />
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Prompt', sans-serif",
        overflow: 'hidden',
        background: '#fff',
    },
    /* ---- Form Side ---- */
    formSide: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: '#fff',
    },
    formInner: {
        width: '100%',
        maxWidth: '380px',
    },
    formTitle: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#1a1a1a',
        margin: '0 0 6px',
    },
    formSub: {
        color: '#888',
        fontSize: '0.9rem',
        marginBottom: '28px',
    },
    socialRow: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
    },
    socialBtn: {
        flex: 1,
        padding: '10px',
        border: '1px solid #e0e0e0',
        borderRadius: '10px',
        background: '#fff',
        fontWeight: '700',
        color: '#555',
        cursor: 'pointer',
        fontSize: '15px',
        transition: 'all 0.2s',
    },
    divider: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '20px 0',
        color: '#ccc',
        fontSize: '13px',
        borderTop: '1px solid #e0e0e0',
        paddingTop: '20px',
    },
    dividerText: {
        color: '#bbb',
        whiteSpace: 'nowrap',
        fontSize: '13px',
    },
    inputGroup: {
        marginBottom: '16px',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '500',
        color: '#444',
        marginBottom: '6px',
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        border: '1px solid #e0e0e0',
        borderRadius: '10px',
        fontSize: '14px',
        fontFamily: "'Prompt', sans-serif",
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
        color: '#333',
    },
    forgot: {
        textAlign: 'right',
        fontSize: '13px',
        color: '#ff4757',
        cursor: 'pointer',
        marginBottom: '20px',
        marginTop: '-8px',
    },
    submitBtn: {
        width: '100%',
        padding: '14px',
        background: '#1a1a1a',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        fontFamily: "'Prompt', sans-serif",
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    switchText: {
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '14px',
        color: '#888',
    },
    switchLink: {
        color: '#ff4757',
        fontWeight: '600',
        cursor: 'pointer',
    },
    /* ---- Panel Side ---- */
    panelSide: {
        flex: 1,
        background: 'linear-gradient(135deg, #ff4757 0%, #ff6b81 60%, #ff8fab 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '40px 20px',
    },
    panelContent: {
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        color: '#fff',
        maxWidth: '320px',
    },
    panelEmoji: {
        fontSize: '60px',
        marginBottom: '20px',
        display: 'block',
    },
    panelTitle: {
        fontSize: '2.5rem',
        fontWeight: '700',
        margin: '0 0 16px',
        color: '#fff',
    },
    panelSub: {
        fontSize: '1rem',
        lineHeight: '1.7',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: '32px',
    },
    panelBtn: {
        background: 'transparent',
        border: '2px solid #fff',
        color: '#fff',
        padding: '12px 40px',
        borderRadius: '50px',
        fontSize: '15px',
        fontWeight: '600',
        fontFamily: "'Prompt', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.3s',
    },
    blob1: {
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        top: '-80px',
        right: '-80px',
    },
    blob2: {
        position: 'absolute',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        bottom: '-60px',
        left: '-60px',
    },
};

export default Login;
