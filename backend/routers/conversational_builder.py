"""
Enhanced Conversational Agent Builder - Complete agent setup through natural conversation
Handles: Agent creation, Products, Training (URLs/FAQs), and full setup
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from routers.auth import verify_token
from openai import AsyncOpenAI
from config import settings
from database.supabase_client import db
from agents.document_processor import get_document_processor
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

router = APIRouter()

# OpenAI client - lazy initialization
openai_client = None

def get_openai_client():
    """Lazy initialization of OpenAI client"""
    global openai_client
    if openai_client is None:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        openai_client = AsyncOpenAI(api_key=api_key)
    return openai_client


class ConversationMessage(BaseModel):
    message: str
    conversation_history: list = []
    extracted_data: dict = {}
    current_phase: str = "agent_info"  # agent_info, products, training, complete


class ConversationResponse(BaseModel):
    response: str
    extracted_data: dict
    current_phase: str
    is_complete: bool
    agent_id: Optional[str] = None
    ui_components: Optional[List[Dict[str, Any]]] = None


# Enhanced system prompt for super-intelligent platform assistant
ENHANCED_BUILDER_PROMPT = """You are an advanced AI assistant with human-like conversation abilities. You help users create and manage sales agents through natural, flowing conversation - just like chatting with an experienced colleague.

**YOUR PERSONALITY:**
- **Natural & Empathetic**: Talk like a real human - use contractions (I'm, you're, that's), casual language, and show understanding
- **Smart Context Awareness**: Remember everything discussed, pick up on hints, understand partial info, infer unstated needs
- **One Question at a Time**: Never overwhelm users with lists. Ask ONE thing, wait for answer, then continue
- **Proactive Helper**: Suggest next steps, offer tips, fill in gaps intelligently
- **Emotionally Intelligent**: Celebrate wins, encourage when stuck, adapt tone to user's energy
- **Concise**: Keep responses short (2-3 sentences max). Don't explain everything - just guide forward
- **Emoji User**: Use emojis naturally like humans do (✨, 🎯, 👍, 🚀, 🤖, 💡, 📊, 🔧, 📚, 🎉, ⚡)

**COMPLETE PLATFORM CAPABILITIES - You can help with EVERYTHING:**

**1. AGENT MANAGEMENT**
- **Show agents** - "show my agents", "list agents", "what agents do I have"
- **Create agent** - Guide through natural conversation (Agent Info → Products → Training)
- **Clone agent** - "clone [name]", "duplicate tech buddy", "copy existing agent"
- **Edit agent** - "change agent name", "update tone to professional", "edit tech buddy"
- **Delete agent** - "delete [name]", "remove old agent"
- **Activate/Deactivate** - "activate agent", "pause tech buddy", "turn off agent"
- **View details** - "show tech buddy details", "what's in my agent"

**2. PRODUCT MANAGEMENT**
- **Add products** - "add a product", "I want to sell [item]"
- **Edit products** - "change price", "update product description"
- **Remove products** - "delete product", "remove [item]"
- **View products** - "show products for tech buddy", "what products do I have"

**3. TRAINING & KNOWLEDGE**
- **Add training** - "train on [URL]", "add FAQ about shipping", "upload document"
- **View training** - "show training data", "what has been trained"
- **Delete training** - "remove URL", "delete FAQ"

**4. TESTING & ANALYTICS**
- **Test agent** - "test tech buddy", "try my agent", "chat with agent"
- **View analytics** - "show stats", "how is my agent performing"
- **View conversations** - "show conversations", "what are people asking"

**5. SMART COMMANDS**
- **Fill demo data** - Create realistic example data instantly
- **Deploy/Save** - "deploy it", "save changes", "create it now"
- **Show current state** - "what do we have", "show me progress"
- **Skip/Next** - Move to next phase
- **Reset/Start over** - Begin fresh

**6. GENERAL HELP**
- Answer questions about the platform
- Explain features
- Guide users through processes
- Troubleshoot issues

**HOW TO RESPOND:**

**UNDERSTAND INTENT FIRST:**
- Agent creation? → Guide through naturally
- Want to view something? → Show data with UI components
- Want to edit? → Ask what to change, then provide navigation
- Want to test? → Direct to test mode
- General question? → Answer helpfully

**CONVERSATION STYLE - BE HUMAN:**

✅ GOOD (Natural, flowing, smart):
- "Perfect! What's your company called?"
- "Got it! So you're selling software tools?"
- "Nice! Let's talk products - what's your main offering?"
- "I can help with that! What changes do you wanna make?"

❌ BAD (Robotic, formal, overwhelming):
- "Please provide the following details: 1. Company Name 2. Description..."
- "I need more information to proceed"
- "Would you like to configure additional parameters?"
- Long explanations or multiple questions at once

**ADVANCED INTELLIGENCE:**
1. **Infer & Extract Smart**: If user says "We're called TechCorp and we sell software", extract BOTH company name AND partial product info
2. **Fill Gaps Intelligently**: If user mentions "tech startup", infer likely industry=technology, tone=modern
3. **Understand Variations**: "yeah", "yep", "sure", "sounds good" all mean YES
4. **Handle Multi-Part**: If user gives multiple pieces of info, acknowledge all and smoothly continue
5. **Read Between Lines**: "We help businesses grow" → likely a B2B service, adjust questions accordingly
6. **Never Repeat**: If you already know something, DON'T ask again
7. **Progressive Disclosure**: Start simple, add complexity only if needed

**KEY RULES:**
1. Extract EVERYTHING user mentions, even from casual speech
2. Make smart assumptions when appropriate (confirm later if critical)
3. Keep momentum - don't bog down with confirmations unless necessary
4. Celebrate progress naturally ("Awesome!", "Perfect!", "Nice!")
5. If stuck, offer specific examples rather than asking open-ended questions

**CRITICAL: WHEN TO SET is_complete TO true:**
For AGENT CREATION only:
- When user says "yes", "create it", "deploy", "save", "done", "finish", "that's it", or similar confirmation
- AND all REQUIRED fields are collected: name, company_name, company_description, greeting_message
- SET: "is_complete": true

DO NOT set is_complete to true until user explicitly confirms they want to create/save the agent!

**AFTER AGENT CREATION:**
- The chat continues - don't end the conversation
- Congratulate user and ask: "Would you like to create another agent, view your agents, or test this one?"
- Be ready for next request (create another, edit existing, view all, etc.)

**RESPONSE FORMAT (JSON):**
{
    "response": "Your natural, conversational response",
    "intent": "show_agents|create_agent|clone_agent|edit_agent|view_details|add_products|test_agent|view_analytics|general_help",
    "action": "show_list|navigate|create|edit|delete",
    "agent_name": "name of agent being discussed (if applicable)",
    "clone_agent_name": "name to clone (if applicable)",
    "navigate_to": "/agents/{id}?tab=products" (if redirecting user),
    "extracted_data": {
        "agent": {"field": "value"},
        "products": [{"name": "", "price": "", "description": "", "features": []}],
        "training": {"urls": [], "faqs": [{"question": "", "answer": ""}]}
    },
    "current_phase": "agent_info|products|training|complete",
    "phase_complete": false,
    "is_complete": false,
    "show_agents_list": false,
    "ui_components": [
        {"type": "agents_list", "agents": [...], "count": X},
        {"type": "agent_details", "agent": {...}},
        {"type": "navigation_button", "label": "Test Agent", "url": "/agents/123?tab=test"}
    ]
}

**EXAMPLES:**

User: "I want to change the tone of Tech Buddy to professional"
You: {
    "response": "I can help you change Tech Buddy's tone to professional. Let me update that for you right now...",
    "intent": "edit_agent",
    "action": "edit",
    "agent_name": "Tech Buddy",
    "edit_field": "tone",
    "edit_value": "professional"
}

User: "Edit tech buddy name to Sales Bot"
You: {
    "response": "Got it! I'll change Tech Buddy's name to Sales Bot.",
    "intent": "edit_agent",
    "action": "edit",
    "agent_name": "Tech Buddy",
    "edit_field": "name",
    "edit_value": "Sales Bot"
}

User: "Update company description for my agent"
You: {
    "response": "Sure! Which agent would you like to update, and what should the new company description be?",
    "intent": "edit_agent",
    "action": "edit"
}

User: "How is my agent performing?"
You: {
    "response": "I'll show you the performance analytics for your agents. Let me take you to the dashboard.",
    "intent": "view_analytics",
    "navigate_to": "/agents/{agent_id}?tab=analytics"
}

User: "Add a product"
You: {
    "response": "Sure! Which agent would you like to add a product to?",
    "intent": "add_products"
}

User: "Test tech buddy"
You: {
    "response": "Great! I'll take you to the test chat where you can try out Tech Buddy. Opening test interface...",
    "intent": "test_agent",
    "agent_name": "Tech Buddy",
    "navigate_to": "/agents/{agent_id}?tab=test-chat"
}

**ADVANCED HUMAN-LIKE EXAMPLES:**

User: "I run a coffee shop called Brew Haven and we do online orders"
You: {
    "response": "Love it! ☕ So you want an agent to help with online coffee orders, right? What vibe should your agent have - friendly and casual, or more professional?",
    "extracted_data": {
        "agent": {
            "company_name": "Brew Haven",
            "industry": "food_and_beverage",
            "company_description": "Coffee shop with online ordering"
        }
    },
    "current_phase": "agent_info"
}

User: "yeah friendly for sure"
You: {
    "response": "Perfect! What should your agent say when customers first chat? Something like 'Hey! Welcome to Brew Haven ☕'?",
    "extracted_data": {
        "agent": {"tone": "friendly"}
    }
}

User: "We sell three coffees - Espresso $3, Latte $4.50, and Cappuccino $4"
You: {
    "response": "Nice menu! Got all three added. Any special features I should mention about these? Like 'made with organic beans' or 'available hot or iced'?",
    "extracted_data": {
        "products": [
            {"name": "Espresso", "price": "3", "description": ""},
            {"name": "Latte", "price": "4.50", "description": ""},
            {"name": "Cappuccino", "price": "4", "description": ""}
        ]
    },
    "current_phase": "products"
}

User: "nah that's it just create it"
You: {
    "response": "You got it! Creating your Brew Haven agent now... ✨",
    "is_complete": true
}

**INTELLIGENCE SHOWCASE:**
- Extracted company name, industry, description from ONE casual sentence
- Understood "yeah" = yes, "nah" = no
- Parsed multiple products with prices from natural speech
- Filled reasonable defaults where appropriate
- Kept conversation flowing naturally without robotic confirmations

Be SUPER intelligent - understand ANY request, infer context, extract ALL info, and help with EVERYTHING in the platform! 🚀
"""


@router.post("/converse", response_model=ConversationResponse)
async def enhanced_converse(
    data: ConversationMessage,
    token_data: dict = Depends(verify_token)
):
    """
    Enhanced conversational agent builder with full setup capabilities
    """
    try:
        user_id = token_data.get('uid')
        user_message = data.message
        conversation_history = data.conversation_history
        extracted_data = data.extracted_data
        current_phase = data.current_phase

        # Build conversation context
        messages = [{"role": "system", "content": ENHANCED_BUILDER_PROMPT}]

        # Add phase context (simplified to prevent token overflow)
        phase_context = f"\n\nCURRENT PHASE: {current_phase}"
        if extracted_data and any(extracted_data.values()):
            # Only include summary to avoid overwhelming the context
            agent_keys = list(extracted_data.get("agent", {}).keys())
            products_count = len(extracted_data.get("products", []))
            training_urls = len(extracted_data.get("training", {}).get("urls", []))
            training_faqs = len(extracted_data.get("training", {}).get("faqs", []))
            phase_context += f"\nCOLLECTED: {len(agent_keys)} agent fields, {products_count} products, {training_urls} URLs, {training_faqs} FAQs"
        messages[0]["content"] += phase_context

        # Add conversation history (limit to prevent token overflow)
        recent_history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
        for msg in recent_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add user's new message
        messages.append({"role": "user", "content": user_message})

        # Get AI response
        client = get_openai_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,  # Reduced for more consistent JSON
            max_tokens=4000,  # Increased to prevent JSON truncation
            response_format={"type": "json_object"}
        )

        # Parse response with error handling
        response_content = response.choices[0].message.content
        try:
            parsed = json.loads(response_content)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response content (first 500 chars): {response_content[:500]}")
            print(f"Response content (last 500 chars): {response_content[-500:]}")
            # Return a fallback response
            return ConversationResponse(
                response="I'm having trouble processing that. Could you tell me more about your business?",
                extracted_data=extracted_data,
                current_phase=current_phase,
                is_complete=False
            )

        # Check if user wants to clone an existing agent
        clone_agent_name = parsed.get("clone_agent_name")
        if clone_agent_name:
            try:
                # Fetch all user's agents
                agents_result = await db.execute_query("agents", "select", filters={"user_id": user_id})
                if agents_result["success"] and agents_result.get("data"):
                    # Find the agent to clone (case-insensitive search)
                    agent_to_clone = None
                    for agent in agents_result["data"]:
                        if clone_agent_name.lower() in agent["name"].lower():
                            agent_to_clone = agent
                            break

                    if agent_to_clone:
                        # Fetch products for this agent
                        products_result = await db.execute_query("products", "select", filters={"agent_id": agent_to_clone["id"]})

                        # Clone agent data (excluding id and user_id)
                        cloned_agent_data = {
                            "company_name": agent_to_clone.get("company_name"),
                            "company_description": agent_to_clone.get("company_description"),
                            "name": agent_to_clone.get("name") + " Clone",  # Add "Clone" to name
                            "industry": agent_to_clone.get("industry"),
                            "target_audience": agent_to_clone.get("target_audience"),
                            "unique_selling_points": agent_to_clone.get("unique_selling_points"),
                            "tone": agent_to_clone.get("tone"),
                            "language": agent_to_clone.get("language"),
                            "sales_strategy": agent_to_clone.get("sales_strategy"),
                            "greeting_message": agent_to_clone.get("greeting_message")
                        }

                        # Clone products
                        cloned_products = []
                        if products_result["success"] and products_result.get("data"):
                            for product in products_result["data"]:
                                features = product.get("features", [])
                                if isinstance(features, str):
                                    try:
                                        features = json.loads(features)
                                    except:
                                        features = []

                                cloned_products.append({
                                    "name": product["name"],
                                    "description": product.get("description", ""),
                                    "price": product["price"],
                                    "features": features
                                })

                        # Update extracted_data with cloned information
                        extracted_data = {
                            "agent": {**extracted_data.get("agent", {}), **cloned_agent_data},
                            "products": cloned_products,
                            "training": extracted_data.get("training", {"urls": [], "faqs": []})
                        }

                        return ConversationResponse(
                            response=f"Perfect! I've cloned '{agent_to_clone['name']}' with all its details and {len(cloned_products)} products. The new agent will be named '{cloned_agent_data['name']}'. Would you like to make any changes, or should I deploy it right away? 🚀",
                            extracted_data=extracted_data,
                            current_phase="products",  # Already have agent info
                            is_complete=False
                        )
                    else:
                        return ConversationResponse(
                            response=f"I couldn't find an agent named '{clone_agent_name}'. Would you like to see your existing agents, or create a new one from scratch?",
                            extracted_data=extracted_data,
                            current_phase=current_phase,
                            is_complete=False
                        )
            except Exception as e:
                print(f"Error cloning agent: {e}")

        # Check if user wants to edit an existing agent
        edit_agent_name = parsed.get("agent_name") if parsed.get("intent") == "edit_agent" else None
        edit_field = parsed.get("edit_field")
        edit_value = parsed.get("edit_value")

        if edit_agent_name and edit_field and edit_value:
            try:
                # Fetch all user's agents
                agents_result = await db.execute_query("agents", "select", filters={"user_id": user_id})
                if agents_result["success"] and agents_result.get("data"):
                    # Find the agent to edit (case-insensitive search)
                    agent_to_edit = None
                    for agent in agents_result["data"]:
                        if edit_agent_name.lower() in agent["name"].lower():
                            agent_to_edit = agent
                            break

                    if agent_to_edit:
                        # Update the agent field
                        update_data = {edit_field: edit_value}
                        update_result = await db.update("agents", agent_to_edit["id"], update_data)

                        if update_result["success"]:
                            return ConversationResponse(
                                response=f"✅ Perfect! I've updated {edit_agent_name}'s {edit_field} to '{edit_value}'. The changes are live now!",
                                extracted_data=extracted_data,
                                current_phase=current_phase,
                                is_complete=False,
                                ui_components=[{
                                    "type": "navigation_button",
                                    "label": f"View {edit_value if edit_field == 'name' else edit_agent_name}",
                                    "url": f"/agents/{agent_to_edit['id']}"
                                }]
                            )
                        else:
                            return ConversationResponse(
                                response=f"I had trouble updating that field. Could you try again or let me know if you need help with something else?",
                                extracted_data=extracted_data,
                                current_phase=current_phase,
                                is_complete=False
                            )
                    else:
                        return ConversationResponse(
                            response=f"I couldn't find an agent named '{edit_agent_name}'. Would you like to see your existing agents?",
                            extracted_data=extracted_data,
                            current_phase=current_phase,
                            is_complete=False
                        )
            except Exception as e:
                print(f"Error editing agent: {e}")
                import traceback
                traceback.print_exc()

        # Check if user wants to see their agents
        show_agents = parsed.get("show_agents_list", False) or parsed.get("intent") == "show_agents"

        if show_agents:
            # Fetch user's agents
            try:
                agents_result = await db.execute_query("agents", "select", filters={"user_id": user_id})
                if agents_result["success"] and agents_result.get("data"):
                    agents_list = agents_result["data"]

                    # Build agents list UI component
                    ui_components = [{
                        "type": "agents_list",
                        "agents": agents_list,
                        "count": len(agents_list)
                    }]

                    return ConversationResponse(
                        response=parsed.get("response", f"You have {len(agents_list)} agent(s). Here they are:"),
                        extracted_data=extracted_data,
                        current_phase=current_phase,
                        is_complete=False,
                        ui_components=ui_components
                    )
                else:
                    return ConversationResponse(
                        response="You don't have any agents yet. Would you like to create your first agent? 🤖",
                        extracted_data=extracted_data,
                        current_phase=current_phase,
                        is_complete=False
                    )
            except Exception as e:
                print(f"Error fetching agents: {e}")

        # Merge extracted data
        merged_data = {
            "agent": {**extracted_data.get("agent", {}), **parsed.get("extracted_data", {}).get("agent", {})},
            "products": extracted_data.get("products", []) + parsed.get("extracted_data", {}).get("products", []),
            "training": {
                "urls": extracted_data.get("training", {}).get("urls", []) + parsed.get("extracted_data", {}).get("training", {}).get("urls", []),
                "faqs": extracted_data.get("training", {}).get("faqs", []) + parsed.get("extracted_data", {}).get("training", {}).get("faqs", [])
            }
        }

        # Remove None/empty values from agent data
        merged_data["agent"] = {k: v for k, v in merged_data["agent"].items() if v}

        # Determine phase and completion
        new_phase = parsed.get("current_phase", current_phase)
        is_complete = parsed.get("is_complete", False)

        # Check if agent info phase is complete
        if new_phase == "agent_info":
            required_fields = ["company_name", "company_description", "name", "industry",
                             "target_audience", "unique_selling_points", "tone",
                             "language", "sales_strategy", "greeting_message"]
            agent_complete = all(f in merged_data["agent"] and merged_data["agent"][f] for f in required_fields)

            if agent_complete and parsed.get("phase_complete", False):
                new_phase = "products"

        # Create agent and products when complete
        agent_id = extracted_data.get("agent_id")
        ui_components = []

        if is_complete and not agent_id:
            try:
                # Create agent with all required fields
                new_agent_id = str(uuid.uuid4())
                pinecone_namespace = f"agent_{new_agent_id}"

                agent_data = {
                    **merged_data["agent"],
                    "id": new_agent_id,
                    "user_id": user_id,
                    "pinecone_namespace": pinecone_namespace,
                    "is_active": True,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": None
                }

                agent_result = await db.create_record("agents", agent_data)

                if not agent_result["success"]:
                    raise Exception(f"Failed to create agent: {agent_result.get('error', 'Unknown error')}")

                if agent_result["success"]:
                    agent_id = agent_result["data"][0]["id"] if isinstance(agent_result["data"], list) else agent_result["data"]["id"]

                    # Create products
                    products_created = 0
                    for product in merged_data.get("products", []):
                        if product.get("name") and product.get("price"):
                            await db.create_record("products", {
                                "agent_id": agent_id,
                                "name": product["name"],
                                "description": product.get("description", ""),
                                "price": float(product["price"]),
                                "features": product.get("features", []),
                                "currency": "USD",
                                "stock_status": "in_stock"
                            })
                            products_created += 1

                    # Process training URLs
                    urls_processed = 0
                    doc_processor = get_document_processor()
                    for url in merged_data.get("training", {}).get("urls", []):
                        try:
                            await doc_processor.process_url(agent_id, url)
                            urls_processed += 1
                        except:
                            pass

                    # Process training FAQs
                    faqs_created = 0
                    for faq in merged_data.get("training", {}).get("faqs", []):
                        if faq.get("question") and faq.get("answer"):
                            # Store FAQ as training data
                            training_record = {
                                "id": str(uuid.uuid4()),
                                "agent_id": agent_id,
                                "type": "faq",
                                "status": "completed",
                                "content": json.dumps(faq),
                                "metadata": faq
                            }
                            await db.create_record("training_data", training_record)
                            faqs_created += 1

                    # Build success UI component
                    ui_components = [{
                        "type": "success_card",
                        "title": f"🎉 {merged_data['agent']['name']} is Ready!",
                        "message": f"Agent created with {products_created} products, {urls_processed} URLs, and {faqs_created} FAQs!",
                        "agent_id": agent_id,
                        "actions": [
                            {"label": "View Agent", "url": f"/agents/{agent_id}"},
                            {"label": "Test Agent", "url": f"/agents/{agent_id}?tab=test-chat"},
                            {"label": "Go to Dashboard", "url": "/dashboard"}
                        ]
                    }]

                    merged_data["agent_id"] = agent_id

                    # Save conversation history to database
                    try:
                        session_id = f"builder-{user_id}-{datetime.utcnow().timestamp()}"

                        # Format conversation history for storage
                        formatted_messages = []
                        for msg in conversation_history:
                            formatted_messages.append({
                                "role": msg.get("role", "user"),
                                "content": msg.get("content", ""),
                                "timestamp": datetime.utcnow().isoformat()
                            })

                        # Save to conversations table
                        conversation_record = {
                            "agent_id": agent_id,
                            "session_id": session_id,
                            "channel": "builder",  # Mark as builder conversation
                            "messages": formatted_messages,
                            "lead_info": {
                                "user_id": user_id,
                                "conversation_type": "agent_creation",
                                "agent_name": merged_data['agent']['name']
                            }
                        }

                        await db.create_record("conversations", conversation_record)
                        print(f"✅ Saved builder conversation for agent {agent_id}")
                    except Exception as conv_error:
                        print(f"⚠️  Failed to save conversation history: {conv_error}")
                        # Don't fail the entire request if conversation save fails
                        pass

                    # Reset for next agent creation - keep chat open
                    is_complete = False
                    new_phase = "agent_info"
                    merged_data = {
                        "agent": {},
                        "products": [],
                        "training": {"urls": [], "faqs": []}
                    }

            except Exception as e:
                print(f"Error creating agent: {e}")
                import traceback
                traceback.print_exc()

        return ConversationResponse(
            response=parsed.get("response", ""),
            extracted_data=merged_data,
            current_phase=new_phase,
            is_complete=is_complete,
            agent_id=agent_id,
            ui_components=ui_components
        )

    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        return ConversationResponse(
            response="I'm having trouble processing that. Could you tell me more about your business?",
            extracted_data=extracted_data,
            current_phase=current_phase,
            is_complete=False
        )
    except Exception as e:
        print(f"Error in conversational builder: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in conversation: {str(e)}"
        )


@router.post("/start")
async def start_conversation(token_data: dict = Depends(verify_token)):
    """Start a new enhanced conversation for complete agent setup"""
    try:
        messages = [
            {"role": "system", "content": ENHANCED_BUILDER_PROMPT},
            {"role": "user", "content": "START"}
        ]

        client = get_openai_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.8,
            max_tokens=300,
            response_format={"type": "json_object"}
        )

        parsed = json.loads(response.choices[0].message.content)

        welcome_message = """👋 Hey! Welcome to ConvoFlow AI Assistant!

I'm your intelligent assistant for EVERYTHING in the platform - just chat with me naturally like you would with a colleague!

**I can help you with:**

🤖 **Agent Management**
• Create, edit, clone, or delete agents
• View agent details and configurations
• Activate or pause agents

📦 **Products & Catalog**
• Add, edit, or remove products
• Update prices and descriptions
• Manage product catalogs

📚 **Training & Knowledge**
• Add training from URLs, documents, or FAQs
• View and manage training data
• Update agent knowledge base

🧪 **Testing & Analytics**
• Test your agents live
• View performance stats
• Check conversation history

💡 **And much more!**
Just tell me what you want to do - I'll understand and help automatically. No commands to remember, no forms to fill - just natural conversation!

**What would you like to do today?** 💬✨"""

        return ConversationResponse(
            response=parsed.get("response", welcome_message),
            extracted_data={
                "agent": {},
                "products": [],
                "training": {"urls": [], "faqs": []}
            },
            current_phase="agent_info",
            is_complete=False
        )

    except Exception as e:
        print(f"Error starting conversation: {e}")

        welcome_message = """👋 Hey! Welcome to ConvoFlow AI Assistant!

I'm your intelligent assistant for EVERYTHING in the platform - just chat with me naturally like you would with a colleague!

**I can help you with:**

🤖 **Agent Management**
• Create, edit, clone, or delete agents
• View agent details and configurations
• Activate or pause agents

📦 **Products & Catalog**
• Add, edit, or remove products
• Update prices and descriptions
• Manage product catalogs

📚 **Training & Knowledge**
• Add training from URLs, documents, or FAQs
• View and manage training data
• Update agent knowledge base

🧪 **Testing & Analytics**
• Test your agents live
• View performance stats
• Check conversation history

💡 **And much more!**
Just tell me what you want to do - I'll understand and help automatically. No commands to remember, no forms to fill - just natural conversation!

**What would you like to do today?** 💬✨"""

        return ConversationResponse(
            response=welcome_message,
            extracted_data={
                "agent": {},
                "products": [],
                "training": {"urls": [], "faqs": []}
            },
            current_phase="agent_info",
            is_complete=False
        )


@router.post("/upload-document")
async def upload_training_document(
    file: UploadFile = File(...),
    agent_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Upload a document during the conversational flow - supports PDF, TXT, and other documents"""
    try:
        user_id = token_data.get('uid')

        # If agent_id provided, verify ownership
        if agent_id:
            agent_result = await db.get_by_id("agents", agent_id)
            if not agent_result["success"] or not agent_result.get("data"):
                raise HTTPException(status_code=404, detail="Agent not found")

            agent = agent_result["data"][0]
            if agent["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Access denied")

        # Read file content
        content = await file.read()
        filename = file.filename.lower()

        # Determine file type and process accordingly
        doc_processor = get_document_processor()

        if filename.endswith('.pdf'):
            # Process PDF
            result = await doc_processor.process_pdf(
                agent_id=agent_id if agent_id else "temp",
                pdf_content=content,
                metadata={"filename": file.filename}
            )
            chunks_created = result.get("chunks_created", 0)

        elif filename.endswith('.txt'):
            # Process text file
            text_content = content.decode('utf-8')
            # Store as training data
            if agent_id:
                training_record = {
                    "id": str(uuid.uuid4()),
                    "agent_id": agent_id,
                    "type": "document",
                    "status": "completed",
                    "content": text_content,
                    "metadata": {"filename": file.filename, "type": "txt"}
                }
                await db.create_record("training_data", training_record)
            chunks_created = 1

        elif filename.endswith(('.doc', '.docx')):
            # For Word documents, we'll store as-is and note it needs processing
            if agent_id:
                training_record = {
                    "id": str(uuid.uuid4()),
                    "agent_id": agent_id,
                    "type": "document",
                    "status": "pending",
                    "content": "Word document uploaded",
                    "metadata": {"filename": file.filename, "type": "docx"}
                }
                await db.create_record("training_data", training_record)
            chunks_created = 1

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Please upload PDF, TXT, DOC, or DOCX files."
            )

        return {
            "success": True,
            "message": f"✅ Document '{file.filename}' uploaded successfully!",
            "filename": file.filename,
            "chunks_created": chunks_created,
            "agent_id": agent_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading document: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
