import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const [email, setEmail] = useState('');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('auth');
        localStorage.removeItem('user');
        navigate('/auth');
        window.location.reload();
    }

    useEffect(() => {
        const user = localStorage.getItem('user');
        const parsedUser = JSON.parse(user);

        if (user) {
            setEmail(parsedUser.mailid);
        }
    }, []);

    return (
        <div className="p-6 max-w-[640px] m-auto">
            <h2 className='text-2xl font-bold mb-4'>Profile</h2>
            <p className='mt-4'>Email: {email}</p>
            <button
                onClick={handleLogout}
                className="p-3 mt-4 bg-blue-500 text-white hover:bg-gray-600 disabled:bg-gray-300"
            >
                Logout
            </button>
        </div>
    )
}

export default Profile