import React, { useEffect, useState } from 'react';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        
        const day = date.getDate();
        const daySuffix = (day) => {
            if (day > 3 && day < 21) return 'th'; 
            switch (day % 10) {
                case 1: return 'st';
                case 2: return 'nd';
                case 3: return 'rd';
                default: return 'th';
            }
        };
        
        const formattedDay = `${day}${daySuffix(day)}`;
        const options = { year: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true };
        const formattedDate = date.toLocaleString('en-GB', options);
    
        return `${formattedDay} ${formattedDate}`;
    };

    useEffect(() => {
        const fetchUserOrders = async () => {
            try {
                const userData = JSON.parse(localStorage.getItem('user'));
                if (!userData || !userData._id) {
                    throw new Error('User data not found in localStorage');
                }
                
                const userId = userData._id;
                
                const response = await fetch(`/user-orders/${userId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch orders');
                }

                const data = await response.json();
                setOrders(data); 
                setLoading(false);
            } catch (error) {
                setError(error.message); 
                setLoading(false);
            }
        };

        fetchUserOrders();
    }, []);
    
    return (
        <div className="p-6 max-w-[640px] m-auto">
            <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
            {orders.length === 0 ? (
                <p>You have no orders.</p>
            ) : (
                <ul>
                    {orders.map((order, index) => (
                        <li key={index} className="mb-4 p-4 bg-slate-100">
                            <h3 className="font-bold">Order ID: {order._id}</h3>
                            <p><strong>Total Price:</strong> ${order.total}</p>
                            <p><strong>Order Date:</strong> {formatDate(order.timestamp)}</p>
                            <h4 className="font-semibold mt-1">Items:</h4>
                            <ul>
                                {order.food_items.map((food, foodIndex) => (
                                    <li key={foodIndex}>{food.name} - ${food.price}</li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default Orders