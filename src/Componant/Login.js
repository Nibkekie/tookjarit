// Componant/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [isLogin, setIsLogin]   = useState(true);
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [name, setName]         = useState('');
    const [loading, setLoading]   = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return alert('กรุณากรอกข้อมูลให้ครบ');
        setLoading(true);
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const body     = isLogin ? { email, password } : { name, email, password };
            const res  = await fetch(`${endpoint}`, {
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
        <div className="login-wrapper">
            {/* ── Form Side ── */}
            <div className="login-form-side">
                <div className="login-form-inner">
                    <h2 className="login-title">
                        {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                    </h2>
                    <p className="login-sub">
                        {isLogin ? 'ยินดีต้อนรับกลับมา!' : 'เริ่มต้นหา Influencer ที่ใช่วันนี้'}
                    </p>

                    {/* Social */}
                    <div className="login-social-row">
                        {['G', 'f', 'in'].map((s) => (
                            <button key={s} className="login-social-btn">{s}</button>
                        ))}
                    </div>
                    <div className="login-divider">
                        <span className="login-divider-text">หรือใช้อีเมล</span>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="login-field">
                                <label className="login-label">ชื่อ</label>
                                <input
                                    type="text"
                                    placeholder="ชื่อของคุณ"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="login-input"
                                    onFocus={e  => (e.target.style.borderColor = '#ff4757')}
                                    onBlur={e   => (e.target.style.borderColor = '#e0e0e0')}
                                />
                            </div>
                        )}

                        <div className="login-field">
                            <label className="login-label">อีเมล</label>
                            <input
                                type="email"
                                placeholder="example@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="login-input"
                                onFocus={e => (e.target.style.borderColor = '#ff4757')}
                                onBlur={e  => (e.target.style.borderColor = '#e0e0e0')}
                            />
                        </div>

                        <div className="login-field">
                            <label className="login-label">รหัสผ่าน</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="login-input"
                                onFocus={e => (e.target.style.borderColor = '#ff4757')}
                                onBlur={e  => (e.target.style.borderColor = '#e0e0e0')}
                            />
                        </div>

                        {isLogin && (
                            <p className="login-forgot">ลืมรหัสผ่าน?</p>
                        )}

                        <button type="submit" className="login-submit" disabled={loading}>
                            {loading ? '...' : isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                        </button>
                    </form>

                    <p className="login-switch">
                        {isLogin ? 'ยังไม่มีบัญชี?' : 'มีบัญชีแล้ว?'}{' '}
                        <span
                            className="login-switch-link"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'สมัครเลย' : 'เข้าสู่ระบบ'}
                        </span>
                    </p>
                </div>
            </div>

            {/* ── Panel Side ── */}
            <div className="login-panel-side">
                <div className="login-panel-content">
                    <span className="login-panel-emoji">✨</span>
                    <h2 className="login-panel-title">
                        {isLogin ? 'สวัสดี, เพื่อน!' : 'ยินดีต้อนรับ!'}
                    </h2>
                    <p className="login-panel-sub">
                        {isLogin
                            ? 'ยังไม่มีบัญชี? สมัครเพื่อเข้าถึง Influencer ที่ #ถูกจริต กับแบรนด์ของคุณ'
                            : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบเพื่อเริ่มใช้งานได้เลย'}
                    </p>
                    <button
                        className="login-panel-btn"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                    </button>
                </div>
                <div className="login-blob login-blob--1" />
                <div className="login-blob login-blob--2" />
            </div>
        </div>
    );
}

export default Login;
