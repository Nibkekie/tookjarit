// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import './styles/global.css';
import './styles/components.css';

import Navbar       from './Componant/Nav';
import Search       from './Componant/Search';
import HowItWorks   from './Componant/HowItWorks';
import AnalysisHome from './Componant/AnalysisHome';
import Analysis     from './Componant/Analysis';
import Favorites    from './Componant/Favorites';
import Login        from './Componant/Login';

function HomePage() {
    return (
        <>
            <Search />
            <HowItWorks />
        </>
    );
}

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/"                 element={<HomePage />} />
                <Route path="/analysis"         element={<AnalysisHome />} />
                <Route path="/analysis/tiktok"  element={<Analysis platform="tiktok" />} />
                <Route path="/analysis/youtube" element={<Analysis platform="youtube" />} />
                <Route path="/favorites"        element={<Favorites />} />
                <Route path="/login"            element={<Login />} />
            </Routes>
        </Router>
    );
}

export default App;