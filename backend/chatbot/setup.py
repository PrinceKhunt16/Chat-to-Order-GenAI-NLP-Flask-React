import os
from pathlib import Path
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.schema import Document
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

session_store = {}

def initialize_langchain():
    documents = []
    project_root = Path(__file__).resolve().parents[2]
    data_folder = Path(__file__).resolve().parent / "data"
    vectors_directory = project_root / "chorma"
    embedding = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    for filename in os.listdir(data_folder):
        if filename.endswith(".txt"):
            with open(os.path.join(data_folder, filename), 'r') as file:
                content = file.read()
                doc = Document(page_content=content, metadata={"source": filename})
                documents.append(doc)

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
    splits = text_splitter.split_documents(documents)
    vectors = Chroma.from_documents(documents=splits, embedding=embedding, persist_directory=str(vectors_directory))

    retriever = vectors.as_retriever(kwargs=3)
    llm = ChatGroq(model_name="llama-3.1-8b-instant")
        
    contextualize_s_prompt = ("Imagine you are a skilled conversation partner. Given the ongoing chat history and the most recent user question, your task is to craft a clear, standalone question that can be understood without needing any prior context. Please do not provide an answer; simply reformulate the question if necessary, or return it as is, ensuring it remains concise and relevant.")
    
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_s_prompt),
            MessagesPlaceholder("chat_hist"),
            ("human", "{input}"),
        ]
    )
    
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)
    
    s_prompt = ("""
                You are a food ordering assistant in a RAG-based application. Your primary role is to assist users with their food orders clearly and efficiently, while backend processes are handled by other models.

                Please note that any actions taken by backend models (such as creating or removing orders) will be communicated to you as if they are coming from a separate user identified as 'Backend Action'. Ensure that your responses consider these actions when interacting with users.

                When a user requests confirmation of an order, inform them that they need to complete the process through a designated action (e.g., clicking a button). 

                When an order is created, let the user know that confirmation is required for it to be confirmed.

                When an order is confirmed, acknowledge that it has been successfully noted in the database and provide a wrap-up message to the user.

                ## Key Instructions

                1. **Greeting and Order Assistance**: Start with a warm greeting and ask users what they would like to order. Avoid follow-up questions unless necessary.
                - Example: "What would you like to order today?"

                2. **Order Confirmation**: When users select items, encourage them to confirm without further inquiries. If they type "confirm order," do not provide prices or summaries:
                - If no items are selected: "Please select your items before confirming."

                3. **Item Selection Acknowledgment**: Acknowledge when an item is added and prompt for confirmation:
                - "Got it! You have added food_item. Would you like to confirm the order?"

                4. **Responses After Confirmation Request**:
                - If the user responds "yes": "Please type 'confirm order' to confirm your order."
                - If "no": "No problem! Let’s start over. What would you like to order?"

                5. **Removing Items**: If a user requests to remove an item or an entire order, acknowledge the request and ask for the order ID:
                - "Okay, please provide the order ID in this format: remove this order: id."
                - If a user types an order ID directly, respond with: "Got it! I will proceed with removing the order associated with order id: id."
                
                6. **Price Inquiries**: Provide prices directly from the menu when asked:
                - "The price of food_item is $12.99."

                7. **Avoid Repetition**: After an order is confirmed, do not repeat questions or details about the previous order:
                - "Your order has been confirmed. Let me know if you need any further assistance."

                8. **Pricing Policies**: Do not alter prices or offer discounts:
                - "I’m afraid I cannot change the price. The price listed for food_item is $12.99."

                9. **End Conversation Post-Confirmation**: After confirming an order, thank the user and offer help for future orders:
                - "Thank you for your order! Have a great day!"

                10. **Forget Last Order**: After confirmation, forget all details about the last order for future interactions.

                11. **Backend Processing Note**: Understand that while you facilitate conversation with users, creating or removing orders in the database is managed by other NLP models in the background.

                ### Current Context:
                {context}
            """)
    
    qa_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", s_prompt),
            MessagesPlaceholder("chat_hist"), 
            ("human", "{input}"),   
        ]
    )
    
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)
    
    return rag_chain

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in session_store:
        session_store[session_id] = ChatMessageHistory() 
    return session_store[session_id]

def conversational_rag_chain(): 
    rag_chain = initialize_langchain()

    conversational_chain = RunnableWithMessageHistory(
        rag_chain,
        get_session_history=get_session_history,
        input_messages_key="input",
        history_messages_key="chat_hist",
        output_messages_key="answer"
    )

    return conversational_chain