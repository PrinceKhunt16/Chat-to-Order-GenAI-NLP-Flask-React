import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from chatbot.setup import conversational_rag_chain 
from nerdetection.detection import extract_food_entities
from intentclassification.classification import predict_text

load_dotenv()
os.environ['HF_TOKEN'] = os.getenv("HF_TOKEN")
os.environ['GROQ_API_KEY'] = os.getenv("GROQ_API_KEY")
 
app = Flask(__name__)
CORS(app, origins='*')
CONNECTION_STRING = "mongodb://localhost:27017/Food-Chatbot"
app.config["MONGO_URI"] = CONNECTION_STRING
db = PyMongo(app).db
rag_chain = conversational_rag_chain()

def serialize_document(doc):
    if doc is not None:
        doc['_id'] = str(doc['_id'])
    return doc

@app.route('/', methods=['GET'])
def home():
    return "Server is running."

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    mailid = data.get('mailid')
    password = data.get('password')

    if not name or not mailid or not password:
        return jsonify({"message": "Please provide name, mailid, and password"}), 400

    if db.users.find_one({"mailid": mailid}):
        return jsonify({"message": "Mailid already exists"}), 400

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    result = db.users.insert_one({
        "name": name,
        "mailid": mailid,
        "password": hashed_password
    })

    user = db.users.find_one({"_id": result.inserted_id})
    user = serialize_document(user) 

    return jsonify({"message": "User registred", "user": user}), 200

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    mailid = data.get('mailid')
    password = data.get('password')

    if not mailid or not password:
        return jsonify({"message": "Please provide mailid and password"}), 400

    user = db.users.find_one({"mailid": mailid})

    if not user or not check_password_hash(user['password'], password):
        return jsonify({"message": "Invalid credentials"}), 401

    user = serialize_document(user) 

    return jsonify({"message": "User logged in", "user": user}), 200

@app.route('/products', methods=['GET'])
def get_products():
    try:
        food_items = db.food.find()
        food_items_list = [serialize_document(item) for item in food_items]
        return jsonify(food_items_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chatbot', methods=['POST'])
def chatbot():
    user_input = request.json.get("user_input")
    session_id = request.json.get("session_id")

    if not user_input:
        return jsonify({"error": "Inputs are required."}), 400

    response = rag_chain.invoke(
        {
            "input": user_input
        }, 
        config = {
            "configurable": {
                "session_id": session_id
            }
        }
    )

    user_intents = predict_text([user_input])

    if "confirm order" in user_input.lower():
        action_message = f"Backend Action: User want to confirm the order so tell him to click the button to complete the process."

        rag_chain.invoke(
            {
                "input": action_message
            },
            config={
                "configurable": {
                    "session_id": session_id
                }
            }
        )

        return jsonify({"response": response["answer"], "intent": "Confirm Order"}), 200
    elif user_intents[0] == "Create Order":
        food_items_extracted = extract_food_entities(user_input)
        
        if not food_items_extracted:
            return jsonify({"response": response["answer"], "intent": "No Intent"}), 200

        food_items_db = db.food.find()
        food_items_list = [serialize_document(item) for item in food_items_db]
        total_price = 0
        order = []

        for food_item in food_items_extracted:
            text = food_item["text"].lower()
            
            for item in food_items_list:
                if re.search(rf'\b{item["name"].lower()}\b', text):
                    order.append({"name": item["name"], "price": item["price"]})
                    total_price += item["price"]

        foods = order
        total = round(total_price, 2)

        action_message = f"Backend Action: Order is created but confirming is remaining. When user will confirm the order then it will note down in db."

        rag_chain.invoke(
            {
                "input": action_message
            },
            config={
                "configurable": {
                    "session_id": session_id
                }
            }
        )

        return jsonify({"response": response["answer"], "intent": "Create Order", "foods": foods, "total": total}), 200
    elif user_intents[0] == "Remove Order":
        order_id_match = re.search(r'([0-9a-fA-F]{24})', user_input)
    
        if order_id_match:
            order_id = order_id_match.group(1) 
            
            existing_order = db.orders.find_one({"_id": ObjectId(order_id)})
            
            if existing_order:
                db.orders.delete_one({"_id": ObjectId(order_id)})

                action_message = f"Backend Action: Removed order with ID: {order_id}."
                
                rag_chain.invoke(
                    {
                        "input": action_message
                    },
                    config={
                        "configurable": {
                            "session_id": session_id
                        }
                    }
                )

                return jsonify({"response": f"Order with ID {order_id} has been removed successfully.", "intent": "Remove Order"}), 200
            else:
                return jsonify({"response": "No order found to remove with ID {order_id}. or Please provide a valid order ID in this format: remove this order: id.", "intent": "Remove Order"}), 400
        else:
            return jsonify({"response": response["answer"], "intent": "No Intent"}), 200
    else:
        return jsonify({"response": response["answer"], "intent": "No Intent"}), 200

@app.route('/confirm-order', methods=['POST'])
def confirm_order():
    try:
        user_id = request.json.get("user_id")
        food_items = request.json.get("food_items")
        total = request.json.get("total")
        timestamp = request.json.get("timestamp")
        session_id = request.json.get("session_id")

        if not user_id or not food_items or not total:
            return jsonify({"error": "user_id, food_items, and total are required."}), 400

        order = {
            "user_id": user_id,
            "food_items": food_items,
            "total": total,
            "timestamp": timestamp
        }

        db.orders.insert_one(order)

        action_message = f"Backend Action: Confrimed the order and noted down in db. Give wrap up message to user."

        rag_chain.invoke(
            {
                "input": action_message
            },
            config={
                "configurable": {
                    "session_id": session_id
                }
            }
        )

        return jsonify({"message": "Order confirmed successfully."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/user-orders/<user_id>', methods=['GET'])
def get_user_orders(user_id):
    try:
        user_orders = db.orders.find({"user_id": user_id})
        orders_list = [serialize_document(order) for order in user_orders]

        if not orders_list:
            return jsonify({"message": "No orders found for this user."}), 404

        return jsonify(orders_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port = 5001, debug = True)