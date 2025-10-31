"""
Unified Chat Router - Manage all agent features through one conversational interface
Supports: Agent creation, Products, Testing, Training, Analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from routers.auth import verify_token
from openai import AsyncOpenAI
from config import settings
import json
from typing import Optional, Dict, Any, List
from database.supabase_client import db
from agents.langgraph_agent import get_sales_agent
from agents.document_processor import get_document_processor
from datetime import datetime, timedelta
import uuid

router = APIRouter()

# OpenAI client - lazy initialization
openai_client = None

def get_openai_client():
    """Lazy initialization of OpenAI client"""
    global openai_client
    if openai_client is None:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="OPENAI_API_KEY not configured"
            )
        openai_client = AsyncOpenAI(api_key=api_key)
    return openai_client


class UnifiedChatMessage(BaseModel):
    message: str
    mode: str = "create"  # create, products, test, training, analytics, general
    agent_id: Optional[str] = None
    conversation_history: list = []
    context: dict = {}


class UnifiedChatResponse(BaseModel):
    response: str
    mode: str
    context: dict
    ui_components: Optional[List[Dict[str, Any]]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    suggested_prompts: Optional[List[str]] = None


# System prompts for different modes
PROMPTS = {
    "create": """You are a friendly AI assistant helping users create a sales agent. Extract these fields naturally:
- company_name, company_description, name, industry, target_audience
- unique_selling_points, tone, language, sales_strategy, greeting_message

Respond in JSON:
{
    "response": "Your friendly message",
    "context": {"field": "value"},
    "is_complete": false,
    "suggested_prompts": ["Next step suggestion"]
}""",

    "products": """You are a product management assistant. Help users:
- Add new products (name, description, price, image)
- View existing products
- Edit product details
- Delete products

Parse user intent and extract product details. Respond in JSON:
{
    "response": "Your message",
    "intent": "add_product|list_products|edit_product|delete_product|view_product",
    "product_data": {"name": "", "description": "", "price": 0, "features": []},
    "context": {"product_id": ""},
    "ui_components": [
        {"type": "product_card", "data": {...}},
        {"type": "button", "label": "Add Product", "action": "add_product"}
    ],
    "suggested_prompts": ["Add another product", "View all products"]
}

Be conversational and extract details naturally.""",

    "test": """You are a test assistant. The user wants to test their sales agent in chat mode.
Your job is to:
1. Explain they can chat with their agent
2. Pass user messages directly to the agent
3. Show agent responses
4. Provide testing feedback

Respond in JSON:
{
    "response": "Message or agent response",
    "mode": "test",
    "pass_to_agent": true/false,
    "ui_components": [{"type": "agent_message", "content": ""}],
    "suggested_prompts": ["Ask about pricing", "Test objection handling"]
}""",

    "training": """You are a training assistant. Help users train their agent with:
- PDF documents
- Website URLs
- FAQs and knowledge

Parse intent and guide the upload process. Respond in JSON:
{
    "response": "Your guidance",
    "intent": "upload_pdf|add_url|add_faq|list_training|delete_training",
    "training_data": {"url": "", "faq_question": "", "faq_answer": ""},
    "ui_components": [
        {"type": "file_upload", "accept": ".pdf"},
        {"type": "training_item", "data": {...}}
    ],
    "suggested_prompts": ["Upload a document", "Add website URL"]
}""",

    "analytics": """You are an analytics assistant. Show users their agent performance:
- Total conversations
- Leads captured
- Popular questions
- Daily statistics

Format data as text-based charts and tables. Respond in JSON:
{
    "response": "Analytics summary",
    "ui_components": [
        {"type": "stat_card", "label": "Conversations", "value": 123},
        {"type": "chart", "data": [...], "chart_type": "line"},
        {"type": "table", "headers": [], "rows": []}
    ],
    "suggested_prompts": ["Show last 7 days", "Export leads"]
}""",

    "general": """You are a helpful assistant managing an AI sales agent platform.
Understand user intent and route to the right mode:
- "create" for new agent
- "products" for product management
- "test" for testing the agent
- "training" for uploading documents
- "analytics" for viewing stats

Respond in JSON:
{
    "response": "Your helpful message",
    "detected_mode": "create|products|test|training|analytics|general",
    "suggested_prompts": ["Create new agent", "Manage products", "Test agent"]
}"""
}


@router.post("/chat", response_model=UnifiedChatResponse)
async def unified_chat(
    data: UnifiedChatMessage,
    token_data: dict = Depends(verify_token)
):
    """
    Unified chat endpoint that handles all agent management through conversation
    """
    try:
        user_id = token_data.get('uid')
        user_message = data.message
        mode = data.mode
        agent_id = data.agent_id
        conversation_history = data.conversation_history
        context = data.context

        # Route to appropriate handler
        if mode == "create":
            return await handle_create_mode(user_message, conversation_history, context, user_id)
        elif mode == "products":
            return await handle_products_mode(user_message, conversation_history, context, agent_id, user_id)
        elif mode == "test":
            return await handle_test_mode(user_message, conversation_history, context, agent_id, user_id)
        elif mode == "training":
            return await handle_training_mode(user_message, conversation_history, context, agent_id, user_id)
        elif mode == "analytics":
            return await handle_analytics_mode(user_message, conversation_history, context, agent_id, user_id)
        else:
            return await handle_general_mode(user_message, conversation_history, context, user_id)

    except Exception as e:
        print(f"❌ Error in unified chat: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in chat: {str(e)}"
        )


async def handle_create_mode(message: str, history: list, context: dict, user_id: str) -> UnifiedChatResponse:
    """Handle agent creation through conversation"""
    client = get_openai_client()

    messages = [{"role": "system", "content": PROMPTS["create"]}]

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    if context:
        messages[0]["content"] += f"\n\nCURRENT DATA: {json.dumps(context)}"

    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.8,
        max_tokens=500,
        response_format={"type": "json_object"}
    )

    parsed = json.loads(response.choices[0].message.content)
    merged_context = {**context, **parsed.get("context", {})}
    merged_context = {k: v for k, v in merged_context.items() if v}

    # Check if complete
    required = ["company_name", "company_description", "name", "industry", "target_audience",
                "unique_selling_points", "tone", "language", "sales_strategy", "greeting_message"]
    is_complete = all(f in merged_context and merged_context[f] for f in required)

    ui_components = []
    if is_complete:
        # Create agent automatically
        try:
            agent_result = await db.create("agents", {
                **merged_context,
                "user_id": user_id,
                "is_active": True
            })

            if agent_result["success"]:
                agent_id = agent_result["data"]["id"]
                ui_components = [{
                    "type": "success_card",
                    "title": "Agent Created!",
                    "message": f"Your agent '{merged_context['name']}' is ready!",
                    "agent_id": agent_id,
                    "actions": [
                        {"label": "Add Products", "mode": "products", "agent_id": agent_id},
                        {"label": "Test Agent", "mode": "test", "agent_id": agent_id},
                        {"label": "Train Agent", "mode": "training", "agent_id": agent_id}
                    ]
                }]
                return UnifiedChatResponse(
                    response=f"🎉 Success! Your agent '{merged_context['name']}' has been created! What would you like to do next?",
                    mode="create",
                    context={"agent_id": agent_id, **merged_context},
                    ui_components=ui_components,
                    suggested_prompts=["Add products", "Test the agent", "Upload training documents"]
                )
        except Exception as e:
            print(f"Error creating agent: {e}")

    return UnifiedChatResponse(
        response=parsed.get("response", ""),
        mode="create",
        context=merged_context,
        ui_components=ui_components,
        suggested_prompts=parsed.get("suggested_prompts", [])
    )


async def handle_products_mode(message: str, history: list, context: dict, agent_id: str, user_id: str) -> UnifiedChatResponse:
    """Handle product management through conversation"""

    # Verify agent ownership
    agent_result = await db.get_by_id("agents", agent_id)
    if not agent_result["success"] or not agent_result.get("data"):
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agent_result["data"][0]
    if agent["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    client = get_openai_client()

    # Get existing products for context
    products_result = await db.execute_query("products", "select", filters={"agent_id": agent_id})
    existing_products = products_result.get("data", []) if products_result["success"] else []

    messages = [{"role": "system", "content": PROMPTS["products"]}]
    messages[0]["content"] += f"\n\nEXISTING PRODUCTS ({len(existing_products)}): {json.dumps(existing_products[:5], indent=2)}"

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=600,
        response_format={"type": "json_object"}
    )

    parsed = json.loads(response.choices[0].message.content)
    intent = parsed.get("intent", "")
    product_data = parsed.get("product_data", {})

    ui_components = []

    # Handle different intents
    if intent == "add_product" and product_data.get("name"):
        # Create product
        try:
            product_result = await db.create("products", {
                "agent_id": agent_id,
                "name": product_data["name"],
                "description": product_data.get("description", ""),
                "price": product_data.get("price", 0),
                "features": json.dumps(product_data.get("features", [])),
                "image_url": product_data.get("image_url")
            })

            if product_result["success"]:
                ui_components.append({
                    "type": "product_card",
                    "data": product_result["data"],
                    "status": "created"
                })
                parsed["response"] = f"✅ Product '{product_data['name']}' added successfully! " + parsed.get("response", "")
        except Exception as e:
            print(f"Error creating product: {e}")
            parsed["response"] = f"❌ Error adding product: {str(e)}"

    elif intent == "list_products":
        ui_components = [
            {"type": "product_list", "products": existing_products, "count": len(existing_products)}
        ]
        if not existing_products:
            parsed["response"] = "You haven't added any products yet. Would you like to add your first product?"

    elif intent == "delete_product":
        product_id = parsed.get("context", {}).get("product_id")
        if product_id:
            try:
                await db.delete("products", product_id)
                parsed["response"] = "✅ Product deleted successfully!"
            except Exception as e:
                parsed["response"] = f"❌ Error deleting product: {str(e)}"

    return UnifiedChatResponse(
        response=parsed.get("response", ""),
        mode="products",
        context=context,
        ui_components=ui_components or parsed.get("ui_components"),
        suggested_prompts=parsed.get("suggested_prompts", ["Add product", "List products", "Go back"])
    )


async def handle_test_mode(message: str, history: list, context: dict, agent_id: str, user_id: str) -> UnifiedChatResponse:
    """Handle agent testing through conversation"""

    # Verify agent ownership
    agent_result = await db.get_by_id("agents", agent_id)
    if not agent_result["success"] or not agent_result.get("data"):
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agent_result["data"][0]
    if agent["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if this is a command or a test message
    if message.lower() in ["exit", "stop", "done", "quit"]:
        return UnifiedChatResponse(
            response="Test session ended. Great job testing your agent! 👍",
            mode="general",
            context={},
            suggested_prompts=["View analytics", "Add more products", "Train agent"]
        )

    if message.lower() in ["start test", "begin test", "test agent"]:
        return UnifiedChatResponse(
            response=f"🧪 Test mode activated! I'll now forward your messages to your agent '{agent['name']}'. Type your test messages as if you were a customer. Type 'exit' to stop testing.",
            mode="test",
            context={"testing": True},
            ui_components=[{
                "type": "info_card",
                "message": "Testing mode active - Messages are sent to your agent"
            }],
            suggested_prompts=["Hi, what products do you offer?", "Tell me about pricing", "Exit test"]
        )

    # Forward message to agent
    try:
        # Get agent config
        products_result = await db.execute_query("products", "select", filters={"agent_id": agent_id})
        products_list = []
        if products_result["success"] and products_result.get("data"):
            for product in products_result["data"]:
                products_list.append({
                    "name": product.get("name"),
                    "description": product.get("description"),
                    "price": product.get("price"),
                    "features": product.get("features", [])
                })

        agent_config = {
            "company_name": agent["company_name"],
            "company_description": agent.get("company_description", ""),
            "products": products_list,
            "tone": agent.get("tone", "friendly"),
            "language": agent.get("language", "en"),
            "greeting_message": agent.get("greeting_message"),
            "sales_strategy": agent.get("sales_strategy")
        }

        session_id = context.get("test_session_id", str(uuid.uuid4()))
        sales_agent = get_sales_agent()

        response = await sales_agent.process_message(
            agent_id=agent_id,
            message=message,
            agent_config=agent_config,
            conversation_history=[],
            session_id=session_id,
            language=agent.get("language", "en")
        )

        return UnifiedChatResponse(
            response=f"🤖 **Agent Response:**\n\n{response['response']}",
            mode="test",
            context={"testing": True, "test_session_id": session_id},
            ui_components=[{
                "type": "agent_message",
                "content": response['response'],
                "agent_name": agent['name']
            }],
            suggested_prompts=["Continue testing...", "Exit test"]
        )
    except Exception as e:
        print(f"Error testing agent: {e}")
        return UnifiedChatResponse(
            response=f"❌ Error testing agent: {str(e)}",
            mode="test",
            context=context,
            suggested_prompts=["Try again", "Exit test"]
        )


async def handle_training_mode(message: str, history: list, context: dict, agent_id: str, user_id: str) -> UnifiedChatResponse:
    """Handle agent training through conversation"""

    # Verify agent ownership
    agent_result = await db.get_by_id("agents", agent_id)
    if not agent_result["success"] or not agent_result.get("data"):
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agent_result["data"][0]
    if agent["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    client = get_openai_client()

    # Get existing training data
    supabase = db.get_client()
    training_result = supabase.table("training_data")\
        .select("*")\
        .eq("agent_id", agent_id)\
        .execute()

    existing_training = training_result.data or []

    messages = [{"role": "system", "content": PROMPTS["training"]}]
    messages[0]["content"] += f"\n\nEXISTING TRAINING ({len(existing_training)} items): {json.dumps(existing_training[:3], indent=2)}"

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=600,
        response_format={"type": "json_object"}
    )

    parsed = json.loads(response.choices[0].message.content)
    intent = parsed.get("intent", "")
    training_data = parsed.get("training_data", {})

    ui_components = []

    # Handle different intents
    if intent == "add_url" and training_data.get("url"):
        try:
            doc_processor = get_document_processor()
            result = await doc_processor.process_url(agent_id, training_data["url"])

            if result["success"]:
                ui_components.append({
                    "type": "success_message",
                    "message": f"✅ URL processed: {result['chunks_created']} chunks created"
                })
                parsed["response"] = f"✅ Successfully trained agent with content from {training_data['url']}!"
        except Exception as e:
            print(f"Error processing URL: {e}")
            parsed["response"] = f"❌ Error processing URL: {str(e)}"

    elif intent == "list_training":
        ui_components = [{
            "type": "training_list",
            "items": existing_training,
            "count": len(existing_training)
        }]
        if not existing_training:
            parsed["response"] = "No training data yet. Upload a PDF or add a URL to get started!"

    elif intent == "delete_training":
        training_id = parsed.get("context", {}).get("training_id")
        if training_id:
            try:
                await db.delete("training_data", training_id)
                parsed["response"] = "✅ Training data deleted successfully!"
            except Exception as e:
                parsed["response"] = f"❌ Error deleting training: {str(e)}"

    # Always show file upload option
    if "ui_components" not in parsed or not parsed["ui_components"]:
        ui_components.append({
            "type": "file_upload_card",
            "accept": ".pdf",
            "label": "Upload PDF Document"
        })

    return UnifiedChatResponse(
        response=parsed.get("response", ""),
        mode="training",
        context=context,
        ui_components=ui_components or parsed.get("ui_components"),
        suggested_prompts=parsed.get("suggested_prompts", ["Add website URL", "List training data", "Go back"])
    )


async def handle_analytics_mode(message: str, history: list, context: dict, agent_id: str, user_id: str) -> UnifiedChatResponse:
    """Handle analytics viewing through conversation"""

    # Verify agent ownership
    agent_result = await db.get_by_id("agents", agent_id)
    if not agent_result["success"] or not agent_result.get("data"):
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agent_result["data"][0]
    if agent["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get analytics data
    supabase = db.get_client()

    # Total conversations
    conv_result = supabase.table("conversations")\
        .select("id", count="exact")\
        .eq("agent_id", agent_id)\
        .execute()
    total_conversations = conv_result.count or 0

    # Total messages
    conv_data = supabase.table("conversations")\
        .select("messages")\
        .eq("agent_id", agent_id)\
        .execute()
    total_messages = sum(len(c.get("messages", [])) for c in (conv_data.data or []))

    # Leads captured
    leads_result = supabase.table("conversations")\
        .select("lead_info", count="exact")\
        .eq("agent_id", agent_id)\
        .not_.is_("lead_info", "null")\
        .execute()
    leads_captured = leads_result.count or 0

    # Recent conversations
    recent_conv = supabase.table("conversations")\
        .select("*")\
        .eq("agent_id", agent_id)\
        .order("created_at", desc=True)\
        .limit(5)\
        .execute()
    recent = recent_conv.data or []

    # Build response with UI components
    ui_components = [
        {
            "type": "stats_grid",
            "stats": [
                {"label": "Total Conversations", "value": total_conversations, "icon": "chat"},
                {"label": "Total Messages", "value": total_messages, "icon": "message"},
                {"label": "Leads Captured", "value": leads_captured, "icon": "user"},
                {"label": "Avg Length", "value": round(total_messages / total_conversations, 1) if total_conversations > 0 else 0, "icon": "chart"}
            ]
        },
        {
            "type": "recent_conversations",
            "conversations": recent,
            "count": len(recent)
        }
    ]

    response_text = f"""📊 **Analytics for {agent['name']}**

**Overview:**
• {total_conversations} conversations
• {total_messages} total messages
• {leads_captured} leads captured
• {round(total_messages / total_conversations, 1) if total_conversations > 0 else 0} avg messages per conversation

{"**Recent Activity:** " + str(len(recent)) + " recent conversations" if recent else "No recent activity"}

What would you like to explore?"""

    return UnifiedChatResponse(
        response=response_text,
        mode="analytics",
        context=context,
        ui_components=ui_components,
        suggested_prompts=["Show leads", "Export data", "View last 7 days", "Go back"]
    )


async def handle_general_mode(message: str, history: list, context: dict, user_id: str) -> UnifiedChatResponse:
    """Handle general conversation and mode detection"""

    client = get_openai_client()

    messages = [{"role": "system", "content": PROMPTS["general"]}]

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=400,
        response_format={"type": "json_object"}
    )

    parsed = json.loads(response.choices[0].message.content)
    detected_mode = parsed.get("detected_mode", "general")

    return UnifiedChatResponse(
        response=parsed.get("response", "How can I help you today?"),
        mode=detected_mode,
        context=context,
        suggested_prompts=parsed.get("suggested_prompts", ["Create agent", "Manage products", "Test agent"])
    )


@router.get("/modes")
async def get_available_modes(token_data: dict = Depends(verify_token)):
    """Get list of available chat modes"""
    return {
        "modes": [
            {"id": "create", "label": "Create Agent", "description": "Build a new sales agent through conversation"},
            {"id": "products", "label": "Manage Products", "description": "Add, edit, or remove products", "requires_agent": True},
            {"id": "test", "label": "Test Agent", "description": "Chat with your agent to test it", "requires_agent": True},
            {"id": "training", "label": "Train Agent", "description": "Upload documents and URLs", "requires_agent": True},
            {"id": "analytics", "label": "View Analytics", "description": "See performance and statistics", "requires_agent": True},
            {"id": "general", "label": "General", "description": "Ask anything or get help"}
        ]
    }
