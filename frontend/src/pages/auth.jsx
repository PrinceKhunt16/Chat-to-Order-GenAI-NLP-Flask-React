import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';

const Auth = () => {
    const [authrCheck, setAuthrCheck] = useState(false);
    const [name, setName] = useState('');
    const [mailid, setMailid] = useState('');
    const [password, setPassword] = useState(''); 
    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();

        const url = authrCheck ? 'http://127.0.0.1:5000/register' : 'http://127.0.0.1:5000/login';

        const data = {
            mailid,
            password
        };

        if (authrCheck) {
            data.name = name;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('auth', true);
                localStorage.setItem('user', JSON.stringify(result.user));
                navigate('/');
                window.location.reload();
            } else {
                console.error('Error:', response.statusText);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
            <form
                className={`max-w-lg rounded-xl w-full bg-white p-6 shadow-md transition-all duration-500 ease-in-out ${authrCheck ? 'min-h-[370px]' : 'min-h-[310px]'}`}
                onSubmit={(e) => handleAuth(e)}
            >
                <h2 className="text-2xl text-center mb-6 transition-all duration-500 ease-in-out">
                    {authrCheck ? 'REGISTER' : 'LOGIN'}
                </h2>
                {authrCheck && (
                    <div className="transition-all duration-500 ease-in-out">
                        <input
                            type="text"
                            className="border border-gray-300 p-2 mb-4 w-full focus:border-gray-500 outline-none"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                )}
                <input
                    type="text"
                    className="border border-gray-300 p-2 mb-4 w-full focus:border-gray-500 outline-none"
                    placeholder="Mail-id"
                    value={mailid}
                    onChange={(e) => setMailid(e.target.value)}
                />
                <input
                    type="password"
                    className="border border-gray-300 p-2 mb-4 w-full focus:border-gray-500 outline-none"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button className="bg-gray-500 hover:bg-gray-600 font-bold text-sm text-white p-4 w-full" type="submit">
                    {authrCheck ? 'REGISTER' : 'LOGIN'}
                </button>
                <div className="mt-4 text-center transition-all duration-500">
                    <button
                        type="button"
                        className="text-gray-500"
                        onClick={() => setAuthrCheck(!authrCheck)}
                    >
                        {authrCheck ? 'Already have an account? LOGIN' : "Don't have an account? REGISTER"}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default Auth