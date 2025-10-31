"""
LangGraph Sales Agent - Orchestrates conversation flow
"""

from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Optional, Annotated
from typing_extensions import TypedDict
import operator
from .llm_service import get_llm_service
from .vector_store import get_vector_store


# Define the agent state
class AgentState(TypedDict):
    """State maintained throughout the conversation"""
    messages: Annotated[List[Dict[str, str]], operator.add]
    agent_id: str
    agent_config: Dict[str, any]
    current_message: str
    retrieved_context: Optional[str]
    response: Optional[str]
    session_id: str
    language: str
    intent: Optional[str]
    lead_info: Optional[Dict[str, str]]


class SalesAgent:
    """LangGraph-based sales conversation agent"""

    def __init__(self):
        """Initialize the sales agent"""
        self.llm_service = get_llm_service()
        self.vector_store = get_vector_store()
        self.graph = self._create_graph()

    def _create_graph(self) -> StateGraph:
        """
        Create the conversation flow graph

        Flow:
        1. Greeting Check - Is this the first message?
        2. Intent Classification - What does the user want?
        3. Context Retrieval - Find relevant information
        4. Response Generation - Create response with LLM
        5. Lead Qualification - Attempt to collect lead info
        """
        # Create workflow
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("greeting_check", self.greeting_check_node)
        workflow.add_node("intent_classification", self.intent_classification_node)
        workflow.add_node("context_retrieval", self.context_retrieval_node)
        workflow.add_node("response_generation", self.response_generation_node)
        workflow.add_node("lead_qualification", self.lead_qualification_node)

        # Define edges (flow)
        workflow.set_entry_point("greeting_check")

        workflow.add_edge("greeting_check", "intent_classification")
        workflow.add_edge("intent_classification", "context_retrieval")
        workflow.add_edge("context_retrieval", "response_generation")
        workflow.add_edge("response_generation", "lead_qualification")
        workflow.add_edge("lead_qualification", END)

        # Compile graph
        return workflow.compile()

    async def greeting_check_node(self, state: AgentState) -> AgentState:
        """
        Node: Check if this is the first message and should use greeting

        Args:
            state: Current agent state

        Returns:
            Updated state
        """
        # Check if this is the first message
        is_first_message = len(state.get("messages", [])) <= 1

        if is_first_message:
            # Use custom greeting if available
            greeting = state["agent_config"].get("greeting_message")

            if not greeting:
                company_name = state["agent_config"].get("company_name", "our company")
                greeting = f"Hello! Welcome to {company_name}. How can I help you today?"

            state["intent"] = "greeting"

        return state

    async def intent_classification_node(self, state: AgentState) -> AgentState:
        """
        Node: Classify user intent

        Common intents:
        - product_inquiry: Asking about products/services
        - pricing: Asking about costs
        - comparison: Comparing options
        - support: Need help/support
        - objection: Expressing concerns
        - ready_to_buy: Ready to purchase
        """
        user_message = state["current_message"].lower()

        # Simple keyword-based intent classification
        # In production, you could use a more sophisticated NLP model

        if any(word in user_message for word in ["price", "cost", "expensive", "cheap", "how much"]):
            intent = "pricing"
        elif any(word in user_message for word in ["buy", "purchase", "order", "get started"]):
            intent = "ready_to_buy"
        elif any(word in user_message for word in ["help", "support", "problem", "issue"]):
            intent = "support"
        elif any(word in user_message for word in ["compare", "difference", "vs", "versus", "better"]):
            intent = "comparison"
        elif any(word in user_message for word in ["but", "however", "concerned", "worry"]):
            intent = "objection"
        else:
            intent = "product_inquiry"

        state["intent"] = intent
        return state

    async def context_retrieval_node(self, state: AgentState) -> AgentState:
        """
        Node: Retrieve relevant context from vector database

        Args:
            state: Current agent state

        Returns:
            Updated state with retrieved context
        """
        import time
        start = time.time()

        agent_id = state["agent_id"]
        user_message = state["current_message"]

        try:
            # OPTIMIZED: Try to search, but fail fast if there's an error
            # This prevents 30+ second delays from Qdrant index errors
            results = await self.vector_store.search(
                agent_id=agent_id,
                query=user_message,
                top_k=3  # Get top 3 relevant chunks
            )

            # Combine retrieved texts
            if results and len(results) > 0:
                context = "\n\n".join([
                    f"[Relevance: {r['score']:.2f}]\n{r['text']}"
                    for r in results
                ])
                state["retrieved_context"] = context
                print(f"⚡ Context retrieval: {(time.time() - start):.3f}s")
            else:
                state["retrieved_context"] = None
                print(f"⚡ Context retrieval skipped (no docs): {(time.time() - start):.3f}s")

        except Exception as e:
            # Fail gracefully - don't let vector DB errors slow down the entire response
            print(f"⚡ Context retrieval skipped (error): {(time.time() - start):.3f}s")
            state["retrieved_context"] = None

        return state

    async def response_generation_node(self, state: AgentState) -> AgentState:
        """
        Node: Generate response using LLM with context

        Args:
            state: Current agent state

        Returns:
            Updated state with generated response
        """
        import time
        start = time.time()

        try:
            # Get conversation history
            messages = state.get("messages", [])

            # Generate response
            response = await self.llm_service.generate_with_context(
                user_message=state["current_message"],
                context=state.get("retrieved_context", ""),
                conversation_history=messages,
                agent_config=state["agent_config"]
            )

            state["response"] = response
            print(f"⚡ Response generation (OpenAI): {(time.time() - start):.3f}s")

        except Exception as e:
            print(f"❌ ERROR in response_generation_node: {str(e)}")
            print(f"❌ Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            print(f"❌ State keys: {state.keys()}")
            print(f"❌ Agent config type: {type(state.get('agent_config'))}")
            state["response"] = "I apologize, but I'm having trouble responding right now. Please try again."

        return state

    async def lead_qualification_node(self, state: AgentState) -> AgentState:
        """
        Node: Attempt to extract lead information from conversation

        Args:
            state: Current agent state

        Returns:
            Updated state with lead info if found
        """
        try:
            # Only extract lead info if conversation has sufficient messages
            messages = state.get("messages", [])

            # Skip entirely for early messages (performance optimization)
            if len(messages) < 5:  # Need more conversation before trying to extract leads
                return state

            # Use LLM to extract lead information
            lead_info = await self.llm_service.extract_lead_info(messages)

            # Only update if we found new information
            if any(lead_info.values()):
                state["lead_info"] = lead_info

        except Exception as e:
            print(f"Error in lead qualification: {str(e)}")

        return state

    async def process_message(
        self,
        agent_id: str,
        message: str,
        agent_config: Dict[str, any],
        conversation_history: List[Dict[str, str]],
        session_id: str,
        language: str = "en"
    ) -> Dict[str, any]:
        """
        Process a user message through the agent graph

        Args:
            agent_id: ID of the agent
            message: User message
            agent_config: Agent configuration (company, products, tone, etc.)
            conversation_history: Previous messages
            session_id: Session identifier
            language: User language

        Returns:
            Dict with response and metadata
        """
        import time
        start_time = time.time()

        try:
            # Create initial state
            initial_state: AgentState = {
                "messages": conversation_history,
                "agent_id": agent_id,
                "agent_config": agent_config,
                "current_message": message,
                "retrieved_context": None,
                "response": None,
                "session_id": session_id,
                "language": language,
                "intent": None,
                "lead_info": None
            }

            # Run the graph
            graph_start = time.time()
            final_state = await self.graph.ainvoke(initial_state)
            graph_time = time.time() - graph_start

            # Handle if final_state is not a dict (safety check)
            if isinstance(final_state, str):
                return {
                    "response": final_state,
                    "intent": None,
                    "lead_info": None,
                    "context_used": False
                }

            total_time = time.time() - start_time
            print(f"⚡ Response generated in {total_time:.2f}s (Graph: {graph_time:.2f}s)")

            # Return result
            return {
                "response": final_state.get("response", "I apologize, I couldn't process that message."),
                "intent": final_state.get("intent"),
                "lead_info": final_state.get("lead_info"),
                "context_used": final_state.get("retrieved_context") is not None
            }

        except Exception as e:
            print(f"Error processing message: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "response": "I apologize, but I encountered an error. Please try again.",
                "intent": None,
                "lead_info": None,
                "context_used": False
            }


# Singleton instance
_sales_agent: Optional[SalesAgent] = None


def get_sales_agent() -> SalesAgent:
    """Get sales agent instance (singleton)"""
    global _sales_agent
    if _sales_agent is None:
        _sales_agent = SalesAgent()
    return _sales_agent
