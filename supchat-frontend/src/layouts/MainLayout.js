// src/layouts/MainLayout.js
import React from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';

function MainLayout() {
    return (
        <div style={{ display: 'flex', flex: '1' }}>
            <Sidebar /* tu peux passer des props ici */ />
            <div style={{ flex: '1' }}>
                <Outlet />
            </div>
        </div>
    );
}

export default MainLayout;