import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Auth from './pages/auth'
import Home from './pages/home'
import About from './pages/about'
import Profile from './pages/profile'
import Orders from './pages/orders'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Chatbot from './components/Chatbot'

const App = () => {
    const [auth, setAuth] = useState(localStorage.getItem('auth'))

    useEffect(() => {
        if (auth) {
            localStorage.setItem('auth', auth)
        } else {
            localStorage.removeItem('auth')
            setAuth(null)
        }

        return () => {
            if (auth) {
                localStorage.setItem('auth', auth)
            }
        }
    }, [localStorage]);

    return (
        <Router>
            <div>
                <ProtectedRoute>
                    <Navbar />
                </ProtectedRoute>
                <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Home />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/about"
                        element={
                            <ProtectedRoute>
                                <About />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute>
                                <Orders />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
                <ProtectedRoute>
                    <Chatbot />
                </ProtectedRoute>
            </div>
        </Router>
    )
}

export default App