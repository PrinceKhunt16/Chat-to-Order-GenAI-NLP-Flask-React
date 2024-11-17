import spacy

nlp = spacy.load("/Users/princekhunt/Documents/Portfolio/Food-Order-with-Chatbot/backend/nerdetection/fine_tuned_NER_food_model")

def extract_food_entities(text):
    normalized_text = text.lower()
    doc = nlp(normalized_text)
    
    food_entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents if ent.label_ == "FOOD"]
    return food_entities