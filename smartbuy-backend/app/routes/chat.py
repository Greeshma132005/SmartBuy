"""AI Chatbot API endpoint with live product search tool and DB-persisted chat sessions."""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.services.ai_service import chat_with_assistant

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatProductResult(BaseModel):
    product_id: str
    name: str
    image_url: str | None = None
    lowest_price: float | None = None
    lowest_platform: str | None = None
    num_platforms: int = 0


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    product_context_query: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    context_used: bool
    products: list[ChatProductResult] = []


class CreateSessionRequest(BaseModel):
    source: str  # "widget" or "askai"


class SessionResponse(BaseModel):
    id: str
    user_id: str
    source: str
    title: str
    created_at: str | None = None
    updated_at: str | None = None


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    products: list | None = None
    created_at: str | None = None


class SendMessageRequest(BaseModel):
    content: str
    product_context_query: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _search_and_persist(query: str) -> tuple[str, list[ChatProductResult]]:
    """
    Run a live product search via ScraperManager (Google Shopping API -> scraper fallback),
    persist results to DB, and return (context_string, product_results).
    """
    from app.scrapers.manager import ScraperManager
    from app.services.product_service import find_or_create_product, store_price_record

    manager = ScraperManager()
    try:
        raw_results = await manager.search_all(query)
    finally:
        await manager.close_all()

    if not raw_results:
        return "No products found for this query.", []

    groups = ScraperManager.deduplicate_results(raw_results)

    context_lines: list[str] = []
    product_results: list[ChatProductResult] = []

    for group in groups[:5]:
        # Persist product
        product_dict = find_or_create_product(
            name=group["name"],
            image_url=group.get("image_url"),
            google_product_id=group.get("google_product_id"),
        )
        if not product_dict:
            continue

        product_id = str(product_dict.get("id", ""))

        # Persist price records
        platforms = group.get("platforms", [])
        price_lines: list[str] = []
        lowest_price: float | None = None
        lowest_platform: str | None = None

        for entry in platforms:
            price = entry.get("price")
            platform = entry.get("platform", "unknown")
            if price is None:
                continue

            store_price_record(
                product_id=product_id,
                platform=platform,
                price=price,
                original_price=entry.get("original_price"),
                product_url=entry.get("product_url"),
                in_stock=entry.get("in_stock", True),
            )

            price_lines.append(f"  - {platform}: ₹{price:,.0f}")
            if lowest_price is None or price < lowest_price:
                lowest_price = price
                lowest_platform = platform

        context_lines.append(
            f"Product: {group['name']}\nPrices:\n" + "\n".join(price_lines)
        )

        product_results.append(
            ChatProductResult(
                product_id=product_id,
                name=group["name"],
                image_url=group.get("image_url"),
                lowest_price=lowest_price,
                lowest_platform=lowest_platform,
                num_platforms=len(platforms),
            )
        )

    context = "\n\n".join(context_lines) if context_lines else "No price data found."
    return context, product_results


# ---------------------------------------------------------------------------
# Original stateless chat endpoint
# ---------------------------------------------------------------------------


@router.post("/", response_model=ChatResponse)
async def chat(body: ChatRequest, current_user: dict = Depends(get_current_user)):
    """Chat with the AI shopping assistant.

    If ``product_context_query`` is provided, a live product search runs first
    (Google Shopping API -> scraper fallback). Results are persisted in the DB
    and fed to the AI as context. The response includes interactive product cards.
    """
    if not body.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty")

    recent = body.messages[-10:]
    msgs = [{"role": m.role, "content": m.content} for m in recent]

    product_context: str | None = None
    context_used = False
    product_results: list[ChatProductResult] = []

    if body.product_context_query:
        try:
            logger.info("Chat: running live search for '%s'", body.product_context_query)
            product_context, product_results = await _search_and_persist(
                body.product_context_query,
            )
            context_used = bool(product_results)
            logger.info(
                "Chat: search returned %d products for '%s'",
                len(product_results),
                body.product_context_query,
            )
        except Exception:
            logger.exception("Chat: live search failed for '%s'", body.product_context_query)

    reply = await chat_with_assistant(msgs, product_context)
    if reply is None:
        reply = (
            "I'm having trouble connecting to my AI brain right now. "
            "Please try again in a moment, or use the search bar to find products directly."
        )

    return ChatResponse(reply=reply, context_used=context_used, products=product_results)


# ---------------------------------------------------------------------------
# Session-based chat endpoints (DB-persisted)
# ---------------------------------------------------------------------------


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: CreateSessionRequest,
    user: dict = Depends(get_current_user),
):
    """Create a new chat session."""
    if body.source not in ("widget", "askai"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source must be 'widget' or 'askai'",
        )

    try:
        db = get_db()
        result = (
            db.table("chat_sessions")
            .insert({
                "user_id": user["id"],
                "source": body.source,
                "title": "New Chat",
            })
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create chat session",
            )
        row = result.data[0]
        return SessionResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            source=row["source"],
            title=row["title"],
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to create chat session for user %s", user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat session",
        )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    source: str | None = Query(default=None),
    user: dict = Depends(get_current_user),
):
    """List the authenticated user's chat sessions, sorted by updated_at DESC."""
    try:
        db = get_db()
        query = (
            db.table("chat_sessions")
            .select("*")
            .eq("user_id", user["id"])
        )
        if source:
            query = query.eq("source", source)
        result = query.order("updated_at", desc=True).execute()
        rows = result.data or []
        return [
            SessionResponse(
                id=str(r["id"]),
                user_id=str(r["user_id"]),
                source=r["source"],
                title=r["title"],
                created_at=r.get("created_at"),
                updated_at=r.get("updated_at"),
            )
            for r in rows
        ]
    except Exception:
        logger.exception("Failed to list chat sessions for user %s", user["id"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch chat sessions",
        )


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def get_session_messages(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Get all messages for a chat session. Verifies ownership."""
    try:
        db = get_db()

        # Verify session exists and belongs to user
        session_result = (
            db.table("chat_sessions")
            .select("*")
            .eq("id", session_id)
            .execute()
        )
        if not session_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {session_id}",
            )
        session = session_result.data[0]
        if session["user_id"] != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this session",
            )

        # Fetch messages
        msg_result = (
            db.table("chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )
        rows = msg_result.data or []
        return [
            MessageResponse(
                id=str(r["id"]),
                session_id=str(r["session_id"]),
                role=r["role"],
                content=r["content"],
                products=r.get("products"),
                created_at=r.get("created_at"),
            )
            for r in rows
        ]
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to fetch messages for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch messages",
        )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a chat session. Only the owning user may delete it."""
    try:
        db = get_db()

        # Verify session exists and belongs to user
        session_result = (
            db.table("chat_sessions")
            .select("*")
            .eq("id", session_id)
            .execute()
        )
        if not session_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {session_id}",
            )
        session = session_result.data[0]
        if session["user_id"] != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this session",
            )

        # Delete session (messages cascade)
        db.table("chat_sessions").delete().eq("id", session_id).execute()
        return {"message": "Session deleted successfully"}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete session",
        )


@router.post("/sessions/{session_id}/message", response_model=ChatResponse)
async def send_message_in_session(
    session_id: str,
    body: SendMessageRequest,
    user: dict = Depends(get_current_user),
):
    """Send a message in a persisted chat session.

    1. Save user message to chat_messages
    2. Load last 10 messages from DB for context
    3. Run product search if product_context_query is provided
    4. Call chat_with_assistant
    5. Save AI reply to chat_messages (with products JSON if any)
    6. Update session title (from first user message) and updated_at
    7. Return ChatResponse
    """
    try:
        db = get_db()

        # Verify session exists and belongs to user
        session_result = (
            db.table("chat_sessions")
            .select("*")
            .eq("id", session_id)
            .execute()
        )
        if not session_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {session_id}",
            )
        session = session_result.data[0]
        if session["user_id"] != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this session",
            )

        # 1. Save user message
        db.table("chat_messages").insert({
            "session_id": session_id,
            "role": "user",
            "content": body.content,
        }).execute()

        # 2. Load last 10 messages for context
        history_result = (
            db.table("chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        history_rows = list(reversed(history_result.data or []))
        msgs = [{"role": r["role"], "content": r["content"]} for r in history_rows]

        # 3. Product search if requested
        product_context: str | None = None
        context_used = False
        product_results: list[ChatProductResult] = []

        search_query = body.product_context_query
        if not search_query:
            # Only trigger live search when user EXPLICITLY asks to search/find.
            # This is strict because the Google Shopping API is expensive (100 req/month).
            # General questions like "what's a good phone?" should NOT trigger a search.
            lower_content = body.content.lower()
            search_phrases = [
                "search for",
                "find me",
                "find prices",
                "look up",
                "search prices",
                "compare prices",
                "show me prices",
                "fetch prices",
                "get prices",
                "check prices",
            ]
            if any(phrase in lower_content for phrase in search_phrases):
                search_query = body.content

        if search_query:
            try:
                logger.info("Session chat: running live search for '%s'", search_query)
                product_context, product_results = await _search_and_persist(search_query)
                context_used = bool(product_results)
                logger.info(
                    "Session chat: search returned %d products for '%s'",
                    len(product_results),
                    search_query,
                )
            except Exception:
                logger.exception("Session chat: live search failed for '%s'", search_query)

        # 4. Call AI assistant
        reply = await chat_with_assistant(msgs, product_context)
        if reply is None:
            reply = (
                "I'm having trouble connecting to my AI brain right now. "
                "Please try again in a moment, or use the search bar to find products directly."
            )

        # 5. Save AI reply
        products_json = (
            [pr.model_dump() for pr in product_results] if product_results else None
        )
        db.table("chat_messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": reply,
            "products": products_json,
        }).execute()

        # 6. Update session title (from first user message) and updated_at
        update_payload: dict = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        # Set title from first user message if still default
        if session["title"] == "New Chat":
            # Use the first ~80 chars of the user's message as the title
            title = body.content[:80].strip()
            if title:
                update_payload["title"] = title

        db.table("chat_sessions").update(update_payload).eq("id", session_id).execute()

        # 7. Return response
        return ChatResponse(reply=reply, context_used=context_used, products=product_results)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to process message in session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message",
        )
