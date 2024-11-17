from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

model_name = "/Users/princekhunt/Documents/Portfolio/Food-Order-with-Chatbot/backend/intentclassification/finetuned-intents-classification-model"
model = AutoModelForSequenceClassification.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)

def predict_text(input_texts):
    inputs = tokenizer(input_texts, padding=True, truncation=True, return_tensors="pt")
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_indices = torch.argmax(logits, dim=1)
    
    label_mapping = {0: "No Intent", 1: "Create Order", 2: "Remove Order"}
    predicted_labels = [label_mapping[idx.item()] for idx in predicted_indices]
    
    return predicted_labels