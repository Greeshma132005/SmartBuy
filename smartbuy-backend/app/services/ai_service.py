"""
AI Service for SmartBuy — Powered by Google Gemini 2.5 Flash
"""

import logging
from typing import List, Dict, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


def _is_configured() -> bool:
    return bool(get_settings().gemini_api_key)


async def _call_gemini(
    contents: List[Dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
    system_instruction: Optional[str] = None,
) -> Optional[str]:
    if not _is_configured():
        logger.warning("Gemini API key not configured")
        return None

    headers = {
        "x-goog-api-key": get_settings().gemini_api_key,
        "Content-Type": "application/json",
    }
    body: dict = {
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GEMINI_URL, headers=headers, json=body)
            if response.status_code == 429:
                logger.warning("Gemini rate limit hit")
                return None
            if response.status_code != 200:
                logger.error("Gemini API error %s: %s", response.status_code, response.text[:300])
                return None
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None
            parts = candidates[0].get("content", {}).get("parts", [])
            return parts[0].get("text", "") if parts else None
    except httpx.TimeoutException:
        logger.error("Gemini API timeout")
        return None
    except Exception as exc:
        logger.error("Gemini API error: %s", exc)
        return None


CHATBOT_SYSTEM_PROMPT = """You are SmartBuy AI Assistant — a helpful, friendly shopping advisor for Indian consumers. You help users find the best deals across Amazon India, Flipkart, Croma, Reliance Digital, TataCliq, and others.

You have a LIVE SEARCH TOOL that can fetch real-time prices from 10+ platforms. However, this tool is EXPENSIVE and only activates when the user explicitly asks to search or find prices.

IMPORTANT — Search tool behavior:
- The tool ONLY runs when the user says phrases like "search for", "find me", "find prices", "compare prices", "show me prices", "check prices", "look up"
- For general questions like "what's a good phone?", "should I buy X?", "tell me about Y" — answer from your knowledge WITHOUT triggering a search
- If you think the user would benefit from a live price search, SUGGEST they say "Search for [product name]" to get real-time prices

Your capabilities:
- Answer general shopping questions from your knowledge (no search needed)
- Recommend products based on budget, features, and use case
- Compare products and suggest which one offers better value
- Explain product specifications in simple language
- When search data IS provided, give specific price-backed advice with BUY NOW or WAIT recommendation

Rules:
- Always respond in a helpful, concise manner (2-4 short paragraphs max)
- Use ₹ (Indian Rupee) for all prices
- When you have product data in the context, use EXACT numbers — mention specific platforms and prices
- When you DON'T have product data, give general advice and suggest: "Say 'Search for [product]' to get live prices from 10+ platforms!"
- Never make up specific prices — only use data provided in the context
- Use bullet points for comparisons
- Be enthusiastic about good deals but honest about overpriced items
- End responses with a clear actionable recommendation
"""


async def chat_with_assistant(
    messages: List[Dict[str, str]],
    product_context: Optional[str] = None,
) -> Optional[str]:
    system = CHATBOT_SYSTEM_PROMPT
    if product_context:
        system += f"\n\nCURRENT PRODUCT DATA FROM SMARTBUY DATABASE:\n{product_context}\n\nUse this data to give specific, data-backed answers."

    gemini_contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        gemini_contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    return await _call_gemini(contents=gemini_contents, system_instruction=system, temperature=0.7, max_tokens=1024)


SUMMARY_SYSTEM_PROMPT = """You are a price analysis AI for SmartBuy, an Indian e-commerce price comparison platform. Generate a brief, insightful product analysis summary.

Rules:
- Write exactly 3-4 sentences
- Be specific — use actual numbers from the provided data
- Use ₹ for prices in Indian format (₹1,09,990)
- Mention the cheapest platform by name
- Comment on whether it's a good time to buy
- If price is near all-time low, highlight that
- If price is above average, suggest waiting
- Be conversational but data-driven
- DO NOT use markdown formatting — write plain text only
"""


async def generate_product_summary(
    product_name: str,
    current_lowest_price: float,
    current_cheapest_platform: str,
    all_time_low: float,
    all_time_high: float,
    average_30d: float,
    num_platforms: int,
    verdict: str,
    percent_vs_average: float,
) -> Optional[str]:
    prompt = f"""Analyze this product's pricing and generate a 3-4 sentence summary:

Product: {product_name}
Current lowest price: ₹{current_lowest_price:,.0f} on {current_cheapest_platform}
All-time low: ₹{all_time_low:,.0f}
All-time high: ₹{all_time_high:,.0f}
30-day average: ₹{average_30d:,.0f}
Price vs average: {percent_vs_average:+.1f}%
Compared across: {num_platforms} platforms
Our verdict: {verdict}

Write a brief, helpful analysis for a shopper deciding whether to buy now."""

    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    return await _call_gemini(contents=contents, system_instruction=SUMMARY_SYSTEM_PROMPT, temperature=0.5, max_tokens=300)
