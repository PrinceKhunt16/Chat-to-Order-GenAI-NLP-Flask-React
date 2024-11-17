import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = () => {
    return (
        <nav className="sticky top-0 bg-blue-600 p-4 shadow-lg">
            <div className="container mx-auto flex justify-between items-center">
                <div className="text-white text-2xl font-bold">
                    <Link to="/">Chat to <span className="text-yellow-400">Order</span>
                    </Link>
                </div>
                <div className="space-x-4">
                    <Link to="/" className="text-white hover:text-yellow-400">
                        Home
                    </Link>
                    <Link to="/about" className="text-white hover:text-yellow-400">
                        About
                    </Link>
                    <Link to="/orders" className="text-white hover:text-yellow-400">
                        Orders
                    </Link>
                    <Link to="/profile" className="text-white hover:text-yellow-400">
                        Profile
                    </Link>
                </div>
            </div>
        </nav>
    )
}

export default Navbar