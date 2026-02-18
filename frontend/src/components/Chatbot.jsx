import React, { useState, useEffect, useRef } from 'react'
import { HiOutlineChatBubbleLeftEllipsis } from "react-icons/hi2";
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

const getDefaultMessage = () => {
    return {
        id: null,
        sender: null,
        text: null,
        is_chat: false,
        is_order_card: false,
        is_button: false,
        is_clicked: false,
        foods: [],
        prices: [],
        buttons: [],
        total: null
    }
}

const Chatbot = () => {
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [messages, setMessages] = useState([
        { ...getDefaultMessage(), id: Date.now(), sender: 'bot', text: "Hello! What do you want to order today? 🍕", is_chat: true },
    ]);
    const [userMessage, setUserMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [lastCreateOrderId, setLastCreateOrderId] = useState(null);
    const [user] = useState(JSON.parse(localStorage.getItem("user")))
    const messageEndRef = useRef(null)

    const confirmOrder = async (messageId) => {
        const userData = JSON.parse(localStorage.getItem('user'));

        if (!userData || !userData._id) {
            console.error("No user data found in localStorage.");
            return;
        }

        const userId = userData._id;
        const message = messages.find((msg) => msg.id === lastCreateOrderId);

        if (!message) {
            console.error("Message not found for the given ID.");
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:5001/confirm-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    food_items: message.foods,
                    total: message.total,
                    timestamp: Date.now(),
                    session_id: user._id
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to confirm order');
            }

            await response.json();
        } catch (error) {
            console.error('Error:', error);
            return;
        }

        const userMessageObject = {
            ...getDefaultMessage(),
            id: Date.now(),
            sender: 'user',
            text: "Confirmed",
            is_chat: true,
        };

        setMessages((prevMessages) => [...prevMessages, userMessageObject]);
        setUserMessage("");
        setLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:5001/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_input: "I have confirmed the order, bye.", session_id: user._id, id: Date.now() }),
            });

            const data = await response.json();
            console.log(data);

            const answer = {
                ...getDefaultMessage(),
                id: Date.now(),
                sender: 'bot',
                text: data.response,
                is_chat: true,
            };

            setMessages((prevMessages) => [...prevMessages, answer]);
        } catch (error) {
            const errorMessage = {
                ...getDefaultMessage(),
                id: Date.now(),
                sender: 'bot',
                text: "Sorry, I'm having trouble connecting to the server.",
                is_chat: true,
            };

            console.error('Error:', error);
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setLoading(false);
        }

        setMessages((prevMessages) => {
            const updatedMessages = prevMessages.map((msg) =>
                msg.id === messageId ? { ...msg, is_clicked: true } : msg
            );
            return updatedMessages;
        });
    }

    const handleSendMessage = async () => {
        if (userMessage.trim()) {
            const userMessageObject = {
                ...getDefaultMessage(),
                id: Date.now(),
                sender: 'user',
                text: userMessage,
                is_chat: true,
            };

            setMessages((prevMessages) => [...prevMessages, userMessageObject]);
            setUserMessage("");
            setLoading(true);

            try {
                const response = await fetch('http://127.0.0.1:5001/chatbot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_input: userMessage, session_id: user._id, id: Date.now() }),
                });

                const data = await response.json();
                console.log(data);

                if (data.intent === "Confirm Order") {
                    const answer = {
                        ...getDefaultMessage(),
                        id: Date.now(),
                        sender: 'bot',
                        text: data.response + "\n Please select an option below to proceed with your order.",
                        is_button: true,
                        buttons: [
                            { label: "Confirm the order", value: "confirm_order" },
                        ],
                    };

                    setMessages((prevMessages) => [...prevMessages, answer]);
                } else if (data.intent === "Create Order") {
                    const answer = {
                        ...getDefaultMessage(),
                        id: Date.now(),
                        sender: 'bot',
                        text: data.response + "Here is your order summary:",
                        is_order_card: true,
                        foods: data.foods,
                        total: data.total,
                    };

                    setLastCreateOrderId(answer.id);
                    setMessages((prevMessages) => [...prevMessages, answer]);
                } else if (data.intent === "No Intent") {
                    const answer = {
                        ...getDefaultMessage(),
                        id: Date.now(),
                        sender: 'bot',
                        text: data.response,
                        is_chat: true,
                    };

                    setMessages((prevMessages) => [...prevMessages, answer]);
                } else if (data.intent === "Remove Order") {
                    const answer = {
                        ...getDefaultMessage(),
                        id: Date.now(),
                        sender: 'bot',
                        text: data.response,
                        is_chat: true,
                    };

                    setMessages((prevMessages) => [...prevMessages, answer]);
                }
            } catch (error) {
                const errorMessage = {
                    ...getDefaultMessage(),
                    id: Date.now(),
                    sender: 'bot',
                    text: "Sorry, I'm having trouble connecting to the server.",
                    is_chat: true,
                };

                console.error('Error:', error);
                setMessages((prevMessages) => [...prevMessages, errorMessage]);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    return (
        <div className="container mx-auto my-4">
            <button
                className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg"
                onClick={() => setIsChatOpen(!isChatOpen)}
            >
                <HiOutlineChatBubbleLeftEllipsis color='#ffffff' fontSize={24} />
            </button>
            {isChatOpen && (
                <div className="fixed bottom-20 right-4 w-96 h-[500px] bg-blue-100 shadow-lg flex flex-col p-4 rounded-3xl">
                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        {messages.map((msg, index) => (
                            <div key={index} className={`mt-2 first:mt-0 max-w-[80%] ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                                {msg.is_chat && (
                                    <ReactMarkdown
                                        rehypePlugins={[rehypeRaw]}
                                        className={`p-2 px-3 rounded-2xl inline-block ${msg.sender === 'user' ? 'bg-blue-200 w-fit flex justify-end ml-auto' : 'bg-white'}`}
                                        children={msg.text}
                                    />
                                )}
                                {msg.is_order_card && (
                                    <div className="p-2 px-3 bg-white rounded-2xl">
                                        <ReactMarkdown
                                            rehypePlugins={[rehypeRaw]}
                                            className={`rounded-2xl inline-block ${msg.sender === 'user' ? 'bg-blue-200 w-fit flex justify-end ml-auto' : 'bg-white'}`}
                                            children={msg.text}
                                        />
                                        <h4 className="font-semibold pb-1 border-b border-b-black">Order Summary</h4>
                                        <ul className="mt-1">
                                            {msg.foods.map((food, idx) => (
                                                <li key={idx} className="flex justify-between">
                                                    <span>{food.name}</span>
                                                    <span>${food.price.toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {msg.total !== null && (
                                            <div className="mt-1 font-semibold pt-1 border-t border-t-black">
                                                Total: ${msg.total.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {msg.is_button && (
                                    <div className="flex flex-col space-y-2 mt-2">
                                        <ReactMarkdown
                                            rehypePlugins={[rehypeRaw]}
                                            className={`p-2 px-3 rounded-2xl inline-block ${msg.sender === 'user' ? 'bg-blue-200 w-fit flex justify-end ml-auto' : 'bg-white'}`}
                                            children={msg.text}
                                        />
                                        {msg.buttons && msg.buttons.map((button, idx) => (
                                            <button
                                                key={idx}
                                                className="w-fit px-4 py-2 bg-black text-white rounded-3xl"
                                                disabled={msg.is_clicked}
                                                onClick={() => confirmOrder(msg.id)}
                                            >
                                                {button.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && <div className="text-gray-500 text-sm text-center">Bot is typing...</div>}
                        <div ref={messageEndRef}></div>
                    </div>
                    <div className="flex items-center mt-4">
                        <input
                            type="text"
                            placeholder="Message to Order"
                            value={userMessage}
                            onChange={(e) => setUserMessage(e.target.value)}
                            className="flex-1 p-2 pl-4 rounded-l-3xl focus:outline-none bg-white border-none focus:ring-0"
                        />
                        <button
                            onClick={handleSendMessage}
                            className="bg-blue-500 text-white px-4 py-2 rounded-r-3xl"
                            disabled={loading}
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Chatbot