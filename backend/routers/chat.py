"""
Chat Router - Handle conversations with AI sales agents
"""

from fastapi import APIRouter, Depends, HTTPException, status
from database.models import ChatRequest, ChatResponse, ChatMessage
from database.supabase_client import get_supabase, db
from routers.auth import optional_verify_token
from agents.langgraph_agent import get_sales_agent
from datetime import datetime
import uuid

router = APIRouter()


@router.post("/{agent_id}/message")
async def chat_with_agent_by_id(
    agent_id: str,
    message_data: dict,
    token_data: dict = Depends(optional_verify_token)
):
    """
    Send a message to a specific agent (simple endpoint for frontend)

    Expects: {"message": "user message"}
    """
    try:
        user_message = message_data.get("message", "")

        if not user_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )

        # Get agent configuration
        agent_result = await db.get_by_id("agents", agent_id)

        if not agent_result["success"] or not agent_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = agent_result["data"][0]

        # Check if agent is active
        if not agent.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent is not active"
            )

        # Fetch products from database
        products_result = await db.execute_query("products", "select", filters={"agent_id": agent_id})
        products_list = []

        if products_result["success"] and products_result.get("data"):
            for product in products_result["data"]:
                products_list.append({
                    "name": product.get("name"),
                    "description": product.get("description"),
                    "detailed_description": product.get("detailed_description"),
                    "price": product.get("price"),
                    "currency": product.get("currency", "USD"),
                    "image_url": product.get("image_url"),
                    "category": product.get("category"),
                    "features": product.get("features", []),
                    "stock_status": product.get("stock_status", "in_stock")
                })

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Get sales agent and process message
        sales_agent = get_sales_agent()

        # Prepare agent config for LangGraph
        agent_config = {
            "company_name": agent["company_name"],
            "company_description": agent.get("company_description", ""),
            "products": products_list,  # Use full product details from database
            "tone": agent.get("tone", "friendly"),
            "language": agent.get("language", "en"),
            "greeting_message": agent.get("greeting_message"),
            "sales_strategy": agent.get("sales_strategy")
        }

        # Process message through LangGraph agent
        result = await sales_agent.process_message(
            agent_id=agent_id,
            message=user_message,
            agent_config=agent_config,
            conversation_history=[],
            session_id=session_id,
            language=agent.get("language", "en")
        )

        # Return response
        return {
            "success": True,
            "response": result["response"],
            "session_id": session_id,
            "agent_id": agent_id,
            "intent": result.get("intent"),
            "lead_info": result.get("lead_info")
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in chat: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat: {str(e)}"
        )


@router.post("/", response_model=ChatResponse)
async def chat_with_agent(
    chat_request: ChatRequest,
    token_data: dict = Depends(optional_verify_token)
):
    """
    Send a message to an AI sales agent

    This endpoint does NOT require authentication (for embedded widgets)
    But can optionally use auth for logged-in users
    """
    try:
        agent_id = chat_request.agent_id
        user_message = chat_request.message
        session_id = chat_request.session_id or str(uuid.uuid4())
        channel = chat_request.channel

        # Get agent configuration
        agent_result = await db.get_by_id("agents", agent_id)

        if not agent_result["success"] or not agent_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = agent_result["data"][0]

        # Check if agent is active
        if not agent.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent is not active"
            )

        # Fetch products from database
        products_result = await db.execute_query("products", "select", filters={"agent_id": agent_id})
        products_list = []

        if products_result["success"] and products_result.get("data"):
            for product in products_result["data"]:
                products_list.append({
                    "name": product.get("name"),
                    "description": product.get("description"),
                    "detailed_description": product.get("detailed_description"),
                    "price": product.get("price"),
                    "currency": product.get("currency", "USD"),
                    "image_url": product.get("image_url"),
                    "category": product.get("category"),
                    "features": product.get("features", []),
                    "stock_status": product.get("stock_status", "in_stock")
                })

        # Get or create conversation
        conversation_result = await db.execute_query(
            "conversations",
            "select",
            filters={
                "session_id": session_id,
                "agent_id": agent_id
            }
        )

        conversation_history = []
        conversation_id = None

        if conversation_result["success"] and conversation_result.get("data"):
            # Existing conversation
            conversation = conversation_result["data"][0]
            conversation_id = conversation["id"]
            conversation_history = conversation.get("messages", [])
        else:
            # New conversation
            conversation_id = str(uuid.uuid4())

        # Add user message to history
        user_msg = ChatMessage(
            role="user",
            content=user_message,
            timestamp=datetime.utcnow()
        )
        conversation_history.append(user_msg.dict())

        # Get sales agent and process message
        sales_agent = get_sales_agent()

        # Prepare agent config for LangGraph
        agent_config = {
            "company_name": agent["company_name"],
            "company_description": agent["company_description"],
            "products": products_list,  # Use full product details from database
            "tone": agent["tone"],
            "language": agent["language"],
            "greeting_message": agent.get("greeting_message"),
            "sales_strategy": agent.get("sales_strategy")
        }

        # Process message through LangGraph agent
        result = await sales_agent.process_message(
            agent_id=agent_id,
            message=user_message,
            agent_config=agent_config,
            conversation_history=conversation_history[:-1],  # Exclude current message
            session_id=session_id,
            language=chat_request.user_language or agent["language"]
        )

        # Add assistant response to history
        assistant_msg = ChatMessage(
            role="assistant",
            content=result["response"],
            timestamp=datetime.utcnow()
        )
        conversation_history.append(assistant_msg.dict())

        # Save or update conversation in database
        conversation_data = {
            "agent_id": agent_id,
            "session_id": session_id,
            "channel": channel,
            "messages": conversation_history,
            "lead_info": result.get("lead_info"),
            "updated_at": datetime.utcnow().isoformat()
        }

        if conversation_result["success"] and conversation_result.get("data"):
            # Update existing conversation
            await db.update_record("conversations", conversation_id, conversation_data)
        else:
            # Create new conversation
            conversation_data["id"] = conversation_id
            conversation_data["created_at"] = datetime.utcnow().isoformat()
            await db.create_record("conversations", conversation_data)

        # Update analytics
        await _update_analytics(agent_id)

        # Return response
        return ChatResponse(
            success=True,
            message=result["response"],
            session_id=session_id,
            agent_id=agent_id,
            metadata={
                "intent": result.get("intent"),
                "context_used": result.get("context_used", False),
                "lead_captured": bool(result.get("lead_info"))
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat: {str(e)}"
        )


@router.get("/conversations/{session_id}")
async def get_conversation(
    session_id: str,
    token_data: dict = Depends(optional_verify_token)
):
    """
    Get conversation history by session ID

    Optional authentication
    """
    try:
        result = await db.execute_query(
            "conversations",
            "select",
            filters={"session_id": session_id}
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch conversation"
            )

        conversations = result.get("data", [])

        if not conversations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        conversation = conversations[0]

        # If authenticated, verify ownership
        if token_data:
            user_id = token_data.get('uid')
            agent_id = conversation["agent_id"]

            # Get agent to verify ownership
            agent_result = await db.get_by_id("agents", agent_id)

            if agent_result["success"] and agent_result.get("data"):
                agent = agent_result["data"][0]
                if agent["user_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied"
                    )

        return {
            "success": True,
            "conversation": conversation
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching conversation: {str(e)}"
        )


@router.delete("/conversations/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    session_id: str,
    token_data: dict = Depends(optional_verify_token)
):
    """
    Delete a conversation

    Optional: If authenticated, verifies ownership
    """
    try:
        # Get conversation first
        result = await db.execute_query(
            "conversations",
            "select",
            filters={"session_id": session_id}
        )

        if not result["success"] or not result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        conversation = result["data"][0]

        # If authenticated, verify ownership
        if token_data:
            user_id = token_data.get('uid')
            agent_id = conversation["agent_id"]

            agent_result = await db.get_by_id("agents", agent_id)

            if agent_result["success"] and agent_result.get("data"):
                agent = agent_result["data"][0]
                if agent["user_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied"
                    )

        # Delete conversation
        await db.delete_record("conversations", conversation["id"])

        return None

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting conversation: {str(e)}"
        )


async def _update_analytics(agent_id: str):
    """
    Update analytics for an agent

    Called after each conversation message
    """
    try:
        today = datetime.utcnow().date().isoformat()

        # Check if analytics record exists for today
        result = await db.execute_query(
            "analytics",
            "select",
            filters={
                "agent_id": agent_id,
                "date": today
            }
        )

        if result["success"] and result.get("data"):
            # Update existing record
            analytics = result["data"][0]
            new_message_count = analytics.get("total_messages", 0) + 1

            await db.update_record(
                "analytics",
                analytics["id"],
                {"total_messages": new_message_count}
            )
        else:
            # Create new analytics record
            await db.create_record("analytics", {
                "id": str(uuid.uuid4()),
                "agent_id": agent_id,
                "date": today,
                "total_conversations": 1,
                "total_messages": 1,
                "leads_captured": 0,
                "conversions": 0
            })

    except Exception as e:
        print(f"Error updating analytics: {str(e)}")
        # Don't fail the request if analytics update fails
        pass
