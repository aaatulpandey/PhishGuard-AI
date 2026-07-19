import os
import json
import random
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import joblib

# Import feature extractor
from feature_extractor import extract_features, get_feature_names

# Ensure the output directory exists
os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)

# Seed for reproducibility
random.seed(42)
np.random.seed(42)

# List of real-looking benign domains
BENIGN_DOMAINS = [
    "google.com", "apple.com", "microsoft.com", "amazon.com", "netflix.com",
    "github.com", "wikipedia.org", "stackoverflow.com", "reddit.com", "youtube.com",
    "nytimes.com", "cnn.com", "linkedin.com", "zoom.us", "dropbox.com",
    "salesforce.com", "medium.com", "spotify.com", "slack.com", "stripe.com",
    "cloudflare.com", "canva.com", "figma.com", "notion.so", "unsplash.com",
    "bitbucket.org", "gitlab.com", "python.org", "npmtrends.com", "npmjs.com"
]

# List of typical benign paths/queries
BENIGN_PATHS = [
    "", "/", "/about", "/contact", "/terms-of-service", "/privacy-policy",
    "/docs/introduction", "/blog/2026/07/updates", "/product/pricing",
    "/search?q=cybersecurity", "/category/news?page=2", "/dashboard/settings"
]

# List of brand names targeted for phishing
TARGET_BRANDS = ["paypal", "chase", "netflix", "metamask", "coinbase", "bankofamerica", "apple", "google", "microsoft"]

# List of suspicious TLDs
SUSPICIOUS_TLDS = ["xyz", "top", "work", "click", "gq", "cf", "tk", "ml", "cc"]

def generate_synthetic_data(num_samples=4000) -> pd.DataFrame:
    """
    Generates a balanced synthetic dataset of benign and phishing URLs based on heuristics.
    This guarantees a functional training set for demo/test purposes.
    """
    data = []
    half_samples = num_samples // 2
    
    # 1. Generate Benign URLs
    for _ in range(half_samples):
        domain = random.choice(BENIGN_DOMAINS)
        # Randomly prefix www.
        if random.random() > 0.5:
            domain = "www." + domain
        path = random.choice(BENIGN_PATHS)
        # Construct benign URL
        protocol = "https://" if random.random() > 0.1 else "http://"
        url = protocol + domain + path
        data.append({"url": url, "label": 0})
        
    # 2. Generate Phishing URLs
    for _ in range(half_samples):
        # We want to trigger various phishing features intentionally
        strategy = random.choice([
            "brand_spoof", "ip_address", "url_shortener", "subdomain_spam", 
            "suspicious_keywords", "special_chars", "punycode", "non_std_port"
        ])
        
        protocol = "http://" if random.random() > 0.7 else "https://"
        
        if strategy == "brand_spoof":
            brand = random.choice(TARGET_BRANDS)
            tld = random.choice(SUSPICIOUS_TLDS + ["com", "net"])
            # Format like: secure-paypal-login-update.com or paypal.update.com.xyz
            pattern = random.choice([
                f"login-{brand}-verify.{tld}",
                f"{brand}-support-account-update.{tld}",
                f"www.{brand}.com-login-verify-account.security-update.xyz"
            ])
            url = protocol + pattern + "/login"
            
        elif strategy == "ip_address":
            # IPv4 address as domain
            ip = f"{random.randint(1, 254)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
            url = protocol + ip + "/index.php?user=login"
            
        elif strategy == "url_shortener":
            # Shortened URL
            shortener = random.choice(["bit.ly", "tinyurl.com", "t.co", "is.gd", "rebrand.ly"])
            slug = "".join(random.choices("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=6))
            url = protocol + shortener + "/" + slug
            
        elif strategy == "subdomain_spam":
            brand = random.choice(TARGET_BRANDS)
            subdomains = ".".join(["secure", "login", "update", brand, "account"])
            url = protocol + subdomains + ".com-security-server.xyz/signin"
            
        elif strategy == "suspicious_keywords":
            domain = random.choice(BENIGN_DOMAINS)
            # Add suspicious directories/files
            path = "/login/verify/update-credentials/webscr.php?cmd=_login-submit"
            url = protocol + domain + path
            
        elif strategy == "special_chars":
            domain = "secure-login-update-credentials-verify-account-chase-bank"
            tld = random.choice(SUSPICIOUS_TLDS)
            url = protocol + domain + f".{tld}/index.html?ref=123&auth=true&session=xyz_abc_123_456"
            
        elif strategy == "punycode":
            # Punycode homograph
            domain = "xn--pypal-tva.com" # Fake paypal domain
            url = protocol + domain + "/login.php"
            
        elif strategy == "non_std_port":
            domain = random.choice(BENIGN_DOMAINS)
            port = random.choice(["8080", "8443", "8888", "9000"])
            url = protocol + domain + f":{port}/login"
            
        data.append({"url": url, "label": 1})
        
    # Shuffle dataset
    random.shuffle(data)
    
    # Extract features for all
    print("Extracting features for synthetic URL dataset...")
    rows = []
    for item in data:
        feats = extract_features(item["url"])
        feats["label"] = item["label"]
        rows.append(feats)
        
    return pd.DataFrame(rows)

def train_and_evaluate():
    """
    Trains multiple models (Logistic Regression, Decision Tree, Random Forest, XGBoost, LightGBM)
    and selects the best one. Saves the model and performance metrics.
    """
    df = generate_synthetic_data(4000)
    
    X = df[get_feature_names()]
    y = df["label"]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print(f"Training set size: {X_train.shape[0]} samples")
    print(f"Test set size: {X_test.shape[0]} samples")
    
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Decision Tree": DecisionTreeClassifier(random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42)
    }
    
    # Try importing and adding XGBoost
    try:
        from xgboost import XGBClassifier
        models["XGBoost"] = XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric="logloss")
        print("XGBoost successfully integrated into training.")
    except ImportError:
        print("XGBoost not installed. Skipping XGBoost model.")
        
    # Try importing and adding LightGBM
    try:
        from lightgbm import LGBMClassifier
        # Set verbosity to -1 to suppress warnings
        models["LightGBM"] = LGBMClassifier(n_estimators=100, random_state=42, verbosity=-1)
        print("LightGBM successfully integrated into training.")
    except ImportError:
        print("LightGBM not installed. Skipping LightGBM model.")
        
    results = {}
    best_model_name = None
    best_f1 = -1.0
    best_model_obj = None
    
    # Fit StandardScaler on training data (used for Logistic Regression, but we save it anyway)
    scaler = StandardScaler()
    scaler.fit(X_train)
    
    for name, model in models.items():
        print(f"\nTraining {name}...")
        
        # Scale features only for Logistic Regression to keep others tree-based raw
        if name == "Logistic Regression":
            X_tr_scaled = scaler.transform(X_train)
            X_te_scaled = scaler.transform(X_test)
            model.fit(X_tr_scaled, y_train)
            preds = model.predict(X_te_scaled)
            probs = model.predict_proba(X_te_scaled)[:, 1]
        else:
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            probs = model.predict_proba(X_test)[:, 1]
            
        # Metrics
        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds)
        rec = recall_score(y_test, preds)
        f1 = f1_score(y_test, preds)
        auc = roc_auc_score(y_test, probs)
        
        results[name] = {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "roc_auc": float(auc)
        }
        
        print(f"{name} Results -> F1: {f1:.4f}, Accuracy: {acc:.4f}, ROC-AUC: {auc:.4f}")
        
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model_obj = model
            
    print(f"\n>>> Best performing model is {best_model_name} with F1-Score of {best_f1:.4f} <<<")
    
    # Feature Importances for the best model
    feature_importance = {}
    feature_names = get_feature_names()
    
    if hasattr(best_model_obj, "feature_importances_"):
        importances = best_model_obj.feature_importances_
        for fn, imp in zip(feature_names, importances):
            feature_importance[fn] = float(imp)
    elif best_model_name == "Logistic Regression" and hasattr(best_model_obj, "coef_"):
        # Use absolute coefficients for feature importance
        importances = np.abs(best_model_obj.coef_[0])
        importances = importances / np.sum(importances) # Normalize
        for fn, imp in zip(feature_names, importances):
            feature_importance[fn] = float(imp)
    else:
        # Equal importance as fallback
        for fn in feature_names:
            feature_importance[fn] = 1.0 / len(feature_names)
            
    # Sort feature importance
    feature_importance = dict(sorted(feature_importance.items(), key=lambda item: item[1], reverse=True))
    
    # Save best model and scaler
    model_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(model_dir, "best_model.joblib")
    scaler_path = os.path.join(model_dir, "scaler.joblib")
    
    # Save them
    joblib.dump(best_model_obj, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"Model saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")
    
    # Save performance metadata
    metadata = {
        "best_model_name": best_model_name,
        "all_model_metrics": results,
        "best_model_metrics": results[best_model_name],
        "feature_importance": feature_importance,
        "feature_names": feature_names
    }
    
    metadata_path = os.path.join(model_dir, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=4)
    print(f"Metadata saved to {metadata_path}")
    
    return best_model_name, results

if __name__ == "__main__":
    train_and_evaluate()
