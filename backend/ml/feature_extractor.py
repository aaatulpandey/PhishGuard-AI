import re
import math
from urllib.parse import urlparse

# List of popular URL shorteners
SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "buff.ly", "adf.ly", "bit.do", 
    "mcaf.ee", "su.pr", "ow.ly", "googl.com", "lnkd.in", "db.tt", "qr.ae", 
    "adfoc.us", "goo.gl", "tiny.cc", "cur.lv", "tiny.one", "rebrand.ly", 
    "shorturl.at", "t2mio.com", "v.gd", "shorte.st", "bl.ink", "clck.ru"
}

# List of suspicious keywords frequently found in phishing URLs
SUSPICIOUS_KEYWORDS = {
    "login", "signin", "bank", "secure", "verify", "account", "update", 
    "credential", "wallet", "support", "billing", "recover", "ebayisapi", 
    "webscr", "free", "gift", "prize", "claim", "limited", "suspend",
    "activity", "logon", "verification", "safe", "service", "customer"
}

# Popular brands targeted by phishing attacks
TARGETED_BRANDS = {
    "paypal", "google", "apple", "microsoft", "amazon", "netflix", "facebook", 
    "instagram", "twitter", "linkedin", "dropbox", "adobe", "yahoo", "steam", 
    "chase", "wellsfargo", "bankofamerica", "binance", "coinbase", "metamask"
}

# Suspicious TLDs commonly used by attackers
SUSPICIOUS_TLDS = {
    "xyz", "top", "work", "loan", "click", "country", "gq", "cf", "tk", "ml", 
    "ga", "club", "info", "online", "support", "site", "vip", "fit", "beauty"
}

def get_entropy(text: str) -> float:
    """Calculates the Shannon Entropy of a string to detect randomness or obfuscation."""
    if not text:
        return 0.0
    entropy = 0.0
    text_len = len(text)
    frequencies = {}
    for char in text:
        frequencies[char] = frequencies.get(char, 0) + 1
    for count in frequencies.values():
        p = count / text_len
        entropy -= p * math.log2(p)
    return entropy

def extract_features(url: str) -> dict:
    """
    Extracts 34 features from a given URL string.
    Returns a dictionary of features mapping to numeric values (0/1 or floats/ints).
    """
    # Standardize URL
    url = url.strip()
    original_url = url
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "http://" + url
    
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    path = parsed.path
    query = parsed.query
    
    # Remove port from domain if present for domain specific checks
    domain_clean = domain.split(":")[0]
    
    features = {}
    
    # 1. URL Length
    features["url_length"] = len(original_url)
    
    # 2. Domain Length
    features["domain_length"] = len(domain_clean)
    
    # 3. Path Length
    features["path_length"] = len(path)
    
    # 4. Query Length
    features["query_length"] = len(query)
    
    # 5. Fragment Length
    features["fragment_length"] = len(parsed.fragment)
    
    # 6. Number of dots in URL
    features["dot_count_url"] = original_url.count(".")
    
    # 7. Number of dots in domain
    features["dot_count_domain"] = domain_clean.count(".")
    
    # 8. Number of hyphens in URL
    features["hyphen_count_url"] = original_url.count("-")
    
    # 9. Number of hyphens in domain
    features["hyphen_count_domain"] = domain_clean.count("-")
    
    # 10. Number of underscores in URL
    features["underscore_count_url"] = original_url.count("_")
    
    # 11. Number of slashes in URL
    features["slash_count_url"] = original_url.count("/")
    
    # 12. Number of question marks in URL
    features["question_count_url"] = original_url.count("?")
    
    # 13. Number of equal signs in URL
    features["equal_count_url"] = original_url.count("=")
    
    # 14. Number of ampersands in URL
    features["ampersand_count_url"] = original_url.count("&")
    
    # 15. Digit count in URL
    features["digit_count_url"] = sum(1 for c in original_url if c.isdigit())
    
    # 16. Digit count in domain
    features["digit_count_domain"] = sum(1 for c in domain_clean if c.isdigit())
    
    # 17. Digit ratio URL
    features["digit_ratio_url"] = features["digit_count_url"] / len(original_url) if len(original_url) > 0 else 0
    
    # 18. Digit ratio domain
    features["digit_ratio_domain"] = features["digit_count_domain"] / len(domain_clean) if len(domain_clean) > 0 else 0
    
    # 19. Subdomain count
    # Domain format: sub2.sub1.domain.co.uk -> check parts
    parts = domain_clean.split(".")
    # Remove empty strings
    parts = [p for p in parts if p]
    features["subdomain_count"] = max(0, len(parts) - 2)
    
    # 20. Special character count URL (non-alphanumeric except standard delimiters)
    special_chars = re.sub(r"[a-zA-Z0-9\.\-\/\?\#\=\&\_]", "", original_url)
    features["special_char_count"] = len(special_chars)
    
    # 21. Presence of @ symbol
    features["has_at_symbol"] = 1 if "@" in original_url else 0
    
    # 22. Presence of double slash in path (redirect indicator)
    features["has_double_slash_path"] = 1 if "//" in path else 0
    
    # 23. IP address as domain (detects both IPv4 and IPv6)
    ipv4_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
    is_ipv4 = re.match(ipv4_pattern, domain_clean) is not None
    is_ipv6 = (":" in domain_clean and not re.match(r"^[a-zA-Z\-]+$", domain_clean))
    features["is_ip_domain"] = 1 if (is_ipv4 or is_ipv6) else 0
    
    # 24. HTTPS usage
    features["uses_https"] = 1 if original_url.lower().startswith("https://") else 0
    
    # 25. HTTP usage
    features["uses_http"] = 1 if original_url.lower().startswith("http://") else 0
    
    # 26. URL Shortener detection
    features["is_shortener"] = 1 if domain_clean in SHORTENERS else 0
    
    # 27. Suspicious keyword count
    keyword_matches = sum(1 for kw in SUSPICIOUS_KEYWORDS if kw in original_url.lower())
    features["suspicious_keyword_count"] = keyword_matches
    
    # 28. Brand name similarity
    # If the domain contains a brand name but the domain is not exactly brand.tld or brand.com
    brand_sim = 0
    for brand in TARGETED_BRANDS:
        if brand in domain_clean:
            # Check if domain_clean matches format "brand.com" or "brand.net" or "www.brand.com"
            # If it's a subdomain like "paypal.security-update.com", it's suspicious
            # We split the domain. If brand is in domain but domain is not exactly brand + TLD
            pattern = rf"^(www\.)?{brand}\.[a-z]{{2,6}}(\.[a-z]{{2,6}})?$"
            if not re.match(pattern, domain_clean):
                brand_sim = 1
                break
    features["brand_similarity"] = brand_sim
    
    # 29. Homograph indicator (Punycode xn-- or non-ASCII characters)
    features["is_homograph"] = 1 if ("xn--" in domain_clean or any(ord(c) > 127 for c in domain_clean)) else 0
    
    # 30. Entropy URL
    features["entropy_url"] = get_entropy(original_url)
    
    # 31. Entropy Domain
    features["entropy_domain"] = get_entropy(domain_clean)
    
    # 32. Suspicious TLD
    tld = domain_clean.split(".")[-1] if "." in domain_clean else ""
    features["suspicious_tld"] = 1 if tld in SUSPICIOUS_TLDS else 0
    
    # 33. Percent-encoded characters
    features["percent_encoded_count"] = len(re.findall(r"%[0-9a-fA-F]{2}", original_url))
    
    # 34. Non-standard ports
    has_non_std_port = 0
    if ":" in domain:
        port_part = domain.split(":")[-1]
        if port_part.isdigit() and port_part not in {"80", "443"}:
            has_non_std_port = 1
    features["non_standard_port"] = has_non_std_port
    
    return features

def get_feature_names() -> list:
    """Returns the ordered list of feature keys."""
    return [
        "url_length", "domain_length", "path_length", "query_length", "fragment_length",
        "dot_count_url", "dot_count_domain", "hyphen_count_url", "hyphen_count_domain",
        "underscore_count_url", "slash_count_url", "question_count_url", "equal_count_url",
        "ampersand_count_url", "digit_count_url", "digit_count_domain", "digit_ratio_url",
        "digit_ratio_domain", "subdomain_count", "special_char_count", "has_at_symbol",
        "has_double_slash_path", "is_ip_domain", "uses_https", "uses_http", "is_shortener",
        "suspicious_keyword_count", "brand_similarity", "is_homograph", "entropy_url",
        "entropy_domain", "suspicious_tld", "percent_encoded_count", "non_standard_port"
    ]
