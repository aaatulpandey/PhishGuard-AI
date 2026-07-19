"""
ML unit tests for PhishGuard AI.
Tests feature extraction accuracy and threat engine classification logic.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.feature_extractor import extract_features, get_feature_names
from ml.threat_engine import analyze_url


def test_feature_names_count():
    """Feature extractor should return exactly 34 named features."""
    assert len(get_feature_names()) == 34


def test_feature_extraction_safe_url():
    url = "https://google.com/"
    features = extract_features(url)
    assert features["url_length"] == len(url)
    assert features["uses_https"] == 1
    assert features["uses_http"] == 0
    assert features["dot_count_domain"] == 1
    assert features["is_ip_domain"] == 0
    assert features["is_shortener"] == 0


def test_feature_extraction_ip_domain():
    url = "http://192.168.0.1/verify/paypal/login.php?ref=1"
    features = extract_features(url)
    assert features["uses_http"] == 1
    assert features["is_ip_domain"] == 1
    assert features["suspicious_keyword_count"] >= 2   # 'verify' and 'login'


def test_feature_extraction_shortener():
    url = "https://bit.ly/3xYz"
    features = extract_features(url)
    assert features["is_shortener"] == 1


def test_feature_extraction_brand_spoof():
    url = "http://paypal-security-update.xyz/login"
    features = extract_features(url)
    assert features["brand_similarity"] == 1
    assert features["suspicious_tld"] == 1


def test_threat_engine_safe():
    url = "https://apple.com"
    res = analyze_url(url)
    assert res["url"] == url
    assert res["classification"] == "Safe"
    assert res["risk_score"] < 40
    assert "indicators" in res
    assert "explanation" in res


def test_threat_engine_phishing():
    url = "http://secure-login-paypal.update-verification-account.xyz/signin"
    res = analyze_url(url)
    assert res["classification"] == "Phishing"
    assert res["risk_score"] >= 70
    assert len(res["indicators"]) > 0
    assert res["recommendation"] is not None


def test_threat_engine_ip_address():
    url = "http://192.168.1.100/login.php?user=admin"
    res = analyze_url(url)
    # IP domains are always suspicious/phishing
    assert res["risk_score"] >= 35
    # Should flag IP usage
    assert any("IP" in ind or "ip" in ind.lower() for ind in res["indicators"])
