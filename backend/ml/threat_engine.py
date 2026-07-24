import os
import joblib
import json
import logging
from urllib.parse import urlparse

# Import feature extractor and feature names
try:
    from ml.feature_extractor import extract_features, get_feature_names
except ImportError:
    from feature_extractor import extract_features, get_feature_names

logger = logging.getLogger(__name__)

# Paths to saved model files
ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ML_DIR, "best_model.joblib")
SCALER_PATH = os.path.join(ML_DIR, "scaler.joblib")
METADATA_PATH = os.path.join(ML_DIR, "model_metadata.json")

# Global variables to hold loaded model and scaler
_model = None
_scaler = None
_metadata = None

def load_model():
    """Lazy loads the ML model, scaler, and metadata."""
    global _model, _scaler, _metadata
    if _model is not None:
        return _model, _scaler, _metadata
        
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            
            if os.path.exists(METADATA_PATH):
                with open(METADATA_PATH, "r") as f:
                    _metadata = json.load(f)
            else:
                _metadata = {"best_model_name": type(_model).__name__}
                
            logger.info(f"Successfully loaded ML model: {_metadata.get('best_model_name')}")
        except Exception as e:
            logger.error(f"Error loading model files: {e}. Falling back to Heuristics Engine.")
            _model = None
            _scaler = None
    else:
        # Model not trained yet
        # We will try to train it if scikit-learn is available
        try:
            logger.info("Model files not found. Attempting to train models on the fly...")
            try:
                from ml.model_trainer import train_and_evaluate
            except ImportError:
                from model_trainer import train_and_evaluate
                
            train_and_evaluate()
            
            if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
                _model = joblib.load(MODEL_PATH)
                _scaler = joblib.load(SCALER_PATH)
                with open(METADATA_PATH, "r") as f:
                    _metadata = json.load(f)
                logger.info(f"Model trained and loaded: {_metadata.get('best_model_name')}")
        except Exception as e:
            logger.error(f"Could not train model on the fly: {e}. Falling back to Heuristics Engine.")
            _model = None
            _scaler = None
            
    return _model, _scaler, _metadata

def run_heuristics_analysis(url: str, features: dict) -> dict:
    """
    Fallback rules-based heuristics analysis.
    Computes a risk score based on weighted flags and matches indicators.
    """
    indicators = []
    score_penalty = 0
    
    # 1. IP address in domain
    if features.get("is_ip_domain", 0) == 1:
        indicators.append("Uses raw IP address instead of a domain name (highly suspicious).")
        score_penalty += 35
        
    # 2. Brand similarity
    if features.get("brand_similarity", 0) == 1:
        indicators.append("Contains a well-known brand name but is hosted on an unofficial domain (look-alike/typosquatting).")
        score_penalty += 35
        
    # 3. URL shorteners
    if features.get("is_shortener", 0) == 1:
        indicators.append("Uses a URL shortener service to mask the destination address.")
        score_penalty += 20
        
    # 4. Insecure protocol
    if features.get("uses_http", 0) == 1:
        indicators.append("Uses insecure HTTP protocol instead of encrypted HTTPS.")
        score_penalty += 15
        
    # 5. Suspicious keywords
    kw_count = features.get("suspicious_keyword_count", 0)
    if kw_count > 0:
        indicators.append(f"Contains {kw_count} credential-harvesting or security keywords (e.g. login, verify, secure).")
        score_penalty += (15 * kw_count)
        
    # 6. Redirection indicator in path
    if features.get("has_double_slash_path", 0) == 1:
        indicators.append("Contains a double slash '//' in the path, indicating hidden URL redirection.")
        score_penalty += 25
        
    # 7. `@` Symbol
    if features.get("has_at_symbol", 0) == 1:
        indicators.append("Contains the '@' symbol, which causes browsers to ignore preceding characters and redirects users to a different destination.")
        score_penalty += 25
        
    # 8. Suspicious TLD
    if features.get("suspicious_tld", 0) == 1:
        indicators.append("Uses a high-risk generic Top-Level Domain (TLD) commonly associated with spam and phishing (e.g., .xyz, .top, .work).")
        score_penalty += 15
        
    # 9. Homograph / Punycode
    if features.get("is_homograph", 0) == 1:
        indicators.append("Contains non-ASCII Unicode characters or Punycode ('xn--'), indicating a potential internationalized domain name (IDN) homograph spoofing attack.")
        score_penalty += 30
        
    # 10. Subdomain count
    sub_count = features.get("subdomain_count", 0)
    if sub_count >= 3:
        indicators.append(f"Uses an excessive number of subdomains ({sub_count}), often used to mimic brand URL structures.")
        score_penalty += 10
        
    # 11. Length penalties
    if features.get("url_length", 0) > 75:
        indicators.append("The URL is unusually long (exceeds 75 characters), which may be used to hide the actual host name.")
        score_penalty += 10
        
    # 12. Non standard ports
    if features.get("non_standard_port", 0) == 1:
        indicators.append("Uses a non-standard network port (not port 80/443), which is atypical for legitimate public web services.")
        score_penalty += 15

    # Bound risk score between 0 and 100
    risk_score = min(99, max(1, score_penalty))
    
    # Classification
    if risk_score >= 70:
        classification = "Phishing"
        confidence = 75.0 + (risk_score - 70) * 0.8
        explanation = "This URL exhibits multiple high-severity phishing indicators, including brand spoofing tactics or obfuscated host signatures. It strongly resembles a threat actor site designed to harvest credentials."
        recommendation = "CRITICAL: Do not visit this website. If you have entered credentials, change them immediately."
    elif risk_score >= 40:
        classification = "Suspicious"
        confidence = 50.0 + (risk_score - 40) * 0.8
        explanation = "This URL triggers several medium-severity rules such as insecure connections and suspicious keywords. While not confirmed phishing, it shows patterns typical of deceptive links."
        recommendation = "WARNING: Proceed with extreme caution. Do not input personal information, passwords, or credit card details."
    else:
        classification = "Safe"
        confidence = 90.0 - risk_score * 0.5
        explanation = "No major threat indicators were triggered. The URL uses secure HTTPS, points to a reputable domain structure, and contains standard path layouts."
        recommendation = "This URL appears safe to browse under normal circumstances."
        
    # Default indicators if empty
    if not indicators:
        indicators.append("No suspicious structural features or keyword flags detected.")
        
    return {
        "url": url,
        "risk_score": round(risk_score),
        "classification": classification,
        "confidence": round(confidence, 1),
        "indicators": indicators,
        "explanation": explanation,
        "recommendation": recommendation,
        "model_name": "Heuristics Engine v1.0",
        "features": features
    }

def analyze_url(url: str) -> dict:
    """
    Analyzes a URL using the trained ML model. Falls back to Heuristics if model is unavailable.
    """
    features = extract_features(url)
    model, scaler, metadata = load_model()
    
    # If no model is loaded, run Heuristics
    if model is None:
        return run_heuristics_analysis(url, features)
        
    try:
        # Convert features to a 2D array in the exact correct order
        feature_names = get_feature_names()
        feature_vector = [features[name] for name in feature_names]
        
        # Make prediction
        if metadata.get("best_model_name") == "Logistic Regression" and scaler is not None:
            scaled_vector = scaler.transform([feature_vector])
            prob = float(model.predict_proba(scaled_vector)[0][1])
        else:
            prob = float(model.predict_proba([feature_vector])[0][1])
            
        risk_score = int(round(prob * 100))
        confidence = float(round((prob if prob >= 0.5 else (1 - prob)) * 100, 1))
        
        if risk_score >= 70:
            classification = "Phishing"
        elif risk_score >= 40:
            classification = "Suspicious"
        else:
            classification = "Safe"
            
        # Compile explanations and recommendations using both the probability and heuristic flags
        heuristics = run_heuristics_analysis(url, features)
        
        # Override the score, classification, and confidence with ML outputs
        heuristics["risk_score"] = risk_score
        heuristics["classification"] = classification
        heuristics["confidence"] = confidence
        heuristics["model_name"] = f"ML Predictor ({metadata.get('best_model_name', 'Model')})"
        
        # Customize explanation if ML prediction differs from heuristics
        if classification == "Phishing":
            heuristics["explanation"] = f"Our machine learning model ({metadata.get('best_model_name')}) classified this URL as high risk ({risk_score}% probability) based on analyzed feature footprints. " + heuristics["explanation"]
        elif classification == "Suspicious":
            heuristics["explanation"] = f"Our machine learning model detected anomalies in the URL structure matching phishing campaigns with {risk_score}% probability. " + heuristics["explanation"]
        else:
            heuristics["explanation"] = f"Our machine learning model classified this URL as safe ({100 - risk_score}% safety probability). " + heuristics["explanation"]
            
        return heuristics
        
    except Exception as e:
        logger.error(f"Error during ML prediction: {e}. Falling back to Heuristics.")
        return run_heuristics_analysis(url, features)

if __name__ == "__main__":
    # Test run
    test_urls = [
        "https://google.com/search?q=test",
        "http://192.168.1.1/login.php",
        "http://secure-login-paypal.update-verification-account.xyz/signin"
    ]
    for test_url in test_urls:
        res = analyze_url(test_url)
        print(f"\nURL: {res['url']}")
        print(f"Score: {res['risk_score']} | Class: {res['classification']} | Confidence: {res['confidence']}%")
        print(f"Model: {res['model_name']}")
        print(f"Indicators: {res['indicators'][:2]}")
