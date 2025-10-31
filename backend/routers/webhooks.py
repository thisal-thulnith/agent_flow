"""
Webhooks Router - Handle webhooks from Telegram, WhatsApp, etc.
"""

from fastapi import APIRouter, Request, HTTPException, status
from typing import Dict, Any
from database.supabase_client import db
from agents.langgraph_agent import get_sales_agent
from datetime import datetime
import uuid

router = APIRouter()


@router.post("/telegram")
async def telegram_webhook(request: Request):
    """
    Handle Telegram bot webhooks

    Telegram sends updates to this endpoint when users message the bot
    """
    try:
        # Parse Telegram update
        data = await request.json()

        # Extract message info
        if "message" not in data:
            return {"ok": True}  # Ignore non-message updates

        message = data["message"]
        chat_id = message["chat"]["id"]
        user_message = message.get("text", "")

        if not user_message:
            return {"ok": True}  # Ignore empty messages

        # Get bot token from message (Telegram includes it in the webhook URL)
        # For now, we'll use a default agent - in production, map bot token to agent
        # You would typically store bot_token -> agent_id mapping in database

        # TODO: Implement bot token to agent_id mapping
        # For now, return error
        return {
            "method": "sendMessage",
            "chat_id": chat_id,
            "text": "Telegram integration is being set up. Please check back soon!"
        }

        # Example of full implementation:
        # 1. Get agent_id from bot token mapping
        # 2. Get agent config from database
        # 3. Process message with LangGraph agent
        # 4. Send response back to Telegram
        #
        # agent_id = await get_agent_id_from_bot_token(bot_token)
        # agent = await db.get_by_id("agents", agent_id)
        # sales_agent = get_sales_agent()
        # result = await sales_agent.process_message(...)
        #
        # return {
        #     "method": "sendMessage",
        #     "chat_id": chat_id,
        #     "text": result["response"]
        # }

    except Exception as e:
        print(f"Error in Telegram webhook: {str(e)}")
        return {"ok": False}


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Handle WhatsApp webhooks (Twilio/Green API)

    Placeholder for WhatsApp integration
    """
    try:
        data = await request.json()

        # WhatsApp webhook handling logic would go here
        # Different providers (Twilio, Green API) have different formats

        return {"success": True, "message": "WhatsApp integration coming soon"}

    except Exception as e:
        print(f"Error in WhatsApp webhook: {str(e)}")
        return {"success": False}


@router.get("/telegram/setup")
async def get_telegram_setup_instructions():
    """
    Get instructions for setting up Telegram bot
    """
    return {
        "success": True,
        "instructions": {
            "step1": "Create a bot with @BotFather on Telegram",
            "step2": "Get your bot token",
            "step3": "Set webhook URL to: https://your-backend-url.com/api/webhooks/telegram",
            "step4": "Link bot token to your agent in the dashboard",
            "command": "Use this command to set webhook:\ncurl -X POST 'https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook' \\\n-H 'Content-Type: application/json' \\\n-d '{\"url\": \"https://your-backend-url.com/api/webhooks/telegram\"}'"
        }
    }


@router.post("/test")
async def test_webhook(data: Dict[str, Any]):
    """
    Test endpoint for webhook development

    Send test payloads to see how they're processed
    """
    return {
        "success": True,
        "received": data,
        "message": "Webhook test successful"
    }
