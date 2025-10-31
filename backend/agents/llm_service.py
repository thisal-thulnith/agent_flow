"""
LLM Service - OpenAI API wrapper with fallback support
"""

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from typing import List, Dict, Optional
from config import settings
import openai


class LLMService:
    """Service for interacting with OpenAI LLM"""

    def __init__(self):
        """Initialize OpenAI client"""
        self.client = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            openai_api_key=settings.OPENAI_API_KEY
        )

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None
    ) -> str:
        """
        Generate a response using OpenAI

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: Optional system message to prepend
            temperature: Optional temperature override

        Returns:
            str: Generated response
        """
        try:
            # Build message list for LangChain
            langchain_messages = []

            # Add system prompt if provided
            if system_prompt:
                langchain_messages.append(SystemMessage(content=system_prompt))

            # Convert messages to LangChain format
            for msg in messages:
                # Handle both dict and string messages
                if isinstance(msg, str):
                    # If message is a string, treat it as user message
                    langchain_messages.append(HumanMessage(content=msg))
                else:
                    # If message is a dict, extract role and content
                    role = msg.get("role", "user")
                    content = msg.get("content", "")

                    if role == "system":
                        langchain_messages.append(SystemMessage(content=content))
                    elif role == "assistant":
                        langchain_messages.append(AIMessage(content=content))
                    else:  # user
                        langchain_messages.append(HumanMessage(content=content))

            # Update temperature if provided
            if temperature is not None:
                self.client.temperature = temperature

            # Generate response
            response = await self.client.ainvoke(langchain_messages)

            return response.content

        except Exception as e:
            print(f"Error generating LLM response: {str(e)}")
            raise

    async def generate_with_context(
        self,
        user_message: str,
        context: str,
        conversation_history: List[Dict[str, str]],
        agent_config: Dict[str, any]
    ) -> str:
        """
        Generate response with RAG context

        Args:
            user_message: Current user message
            context: Retrieved context from vector database
            conversation_history: Previous messages
            agent_config: Agent configuration (tone, products, etc.)

        Returns:
            str: Generated response
        """
        # Build system prompt with agent personality
        system_prompt = self._build_system_prompt(agent_config, context)

        # Build message history
        messages = []

        # Add conversation history (limit to last N messages)
        history_limit = min(len(conversation_history), settings.MAX_CONVERSATION_HISTORY)
        for msg in conversation_history[-history_limit:]:
            messages.append(msg)

        # Add current message
        messages.append({"role": "user", "content": user_message})

        # Generate response
        response = await self.generate_response(
            messages=messages,
            system_prompt=system_prompt
        )

        return response

    def _build_system_prompt(self, agent_config: Dict[str, any], context: str) -> str:
        """
        Build system prompt for the agent

        Args:
            agent_config: Agent configuration
            context: Retrieved context from knowledge base

        Returns:
            str: System prompt
        """
        company_name = agent_config.get("company_name", "our company")
        company_description = agent_config.get("company_description", "")
        products = agent_config.get("products", [])
        tone = agent_config.get("tone", "friendly")
        sales_strategy = agent_config.get("sales_strategy", "consultative")

        # Build products list - handle both string and dict formats
        if products:
            products_list = []
            for p in products:
                if isinstance(p, str):
                    # If product is a string, use it directly
                    products_list.append(f"- {p}")
                elif isinstance(p, dict):
                    # Format detailed product information
                    name = p.get('name', 'Unknown')
                    desc = p.get('description', '')
                    price = p.get('price')
                    currency = p.get('currency', 'USD')
                    features = p.get('features', [])
                    stock = p.get('stock_status', 'in_stock')

                    product_info = f"• {name}"
                    if price:
                        product_info += f" - {currency} {price}"
                    if desc:
                        product_info += f"\n  {desc}"
                    if features and len(features) > 0:
                        product_info += f"\n  Features: {', '.join(features[:3])}"  # Limit to 3 features
                    if stock != 'in_stock':
                        product_info += f"\n  Status: {stock}"

                    products_list.append(product_info)

            products_text = "\n".join(products_list)
        else:
            products_text = "No specific products listed yet."

        # Professional Sales Agent Prompt with Advanced Skills
        context_section = f"\n\nKNOWLEDGE BASE:\n{context[:300]}" if context else ""

        system_prompt = f"""You are a helpful and professional {tone} sales agent for {company_name}. {company_description}

YOUR ROLE:
- Answer questions clearly and helpfully
- Provide information about our products and services
- Assist customers in making informed decisions
- Be conversational, natural, and {tone} in your responses

PRODUCTS & SERVICES:
{products_text[:500]}
{context_section}

HOW TO RESPOND:

**When asked "what can you do" or "help":**
- Explain you can help with: product information, pricing, recommendations, answering questions, placing orders, and support
- List the main products/services available
- Ask how you can help them today

**When greeted (hi, hello, hey):**
- Respond naturally and warmly
- Briefly introduce what you can help with
- Ask an open question to start the conversation

**General Questions:**
- Answer directly and clearly
- Provide relevant details from the product list or knowledge base
- Be helpful and informative

**Sales Approach ({sales_strategy}):**
1. Build rapport naturally - be warm and {tone}
2. Understand customer needs through conversation
3. Recommend solutions that fit their needs
4. Handle concerns professionally and honestly
5. Guide interested customers toward next steps
6. When appropriate, ask for contact info to follow up

**Objection Handling:**
- Price concerns: Focus on value and benefits
- Timing issues: Understand their timeline, offer flexibility
- Competitor questions: Highlight what makes us unique
- Listen first, then address concerns with helpful information

**Key Principles:**
- Be conversational and natural, not robotic
- Answer questions directly before trying to sell
- Build trust through helpful, honest responses
- Guide interested customers smoothly toward purchase
- Keep responses concise (2-4 sentences usually)
- Use the knowledge base context when available

Remember: Help first, sell second. Build trust through being genuinely helpful."""

        return system_prompt

    async def extract_lead_info(self, conversation_messages: List[Dict[str, str]]) -> Dict[str, Optional[str]]:
        """
        Extract lead information from conversation using LLM

        Args:
            conversation_messages: Full conversation history

        Returns:
            Dict with name, email, phone, interest_level
        """
        try:
            # Build extraction prompt
            extraction_prompt = """Analyze the following conversation and extract any lead information mentioned.

Extract:
- Name
- Email
- Phone number
- Interest level (high/medium/low based on their engagement)

Return ONLY a JSON object with these fields. Use null for missing information.
Example: {"name": "John Doe", "email": "john@email.com", "phone": "+1234567890", "interest_level": "high"}

Conversation:
"""
            for msg in conversation_messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                extraction_prompt += f"\n{role}: {content}"

            # Use OpenAI directly for structured output
            response = await self.client.ainvoke([HumanMessage(content=extraction_prompt)])

            # Parse JSON from response
            import json
            try:
                lead_info = json.loads(response.content)
                return lead_info
            except json.JSONDecodeError:
                return {"name": None, "email": None, "phone": None, "interest_level": None}

        except Exception as e:
            print(f"Error extracting lead info: {str(e)}")
            return {"name": None, "email": None, "phone": None, "interest_level": None}


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get LLM service instance (singleton)"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
