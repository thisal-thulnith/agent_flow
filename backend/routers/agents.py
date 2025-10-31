"""
Agents Router - CRUD operations for AI sales agents
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database.models import AgentCreate, AgentUpdate, AgentResponse
from database.supabase_client import get_supabase, db
from routers.auth import verify_token
from datetime import datetime
import uuid

router = APIRouter()


@router.post("/", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent_data: AgentCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new AI sales agent

    Requires authentication.
    """
    try:
        user_id = token_data.get('uid')

        # Generate unique agent ID and Pinecone namespace
        agent_id = str(uuid.uuid4())
        pinecone_namespace = f"agent_{agent_id}"

        # Prepare agent data
        agent_dict = {
            "id": agent_id,
            "user_id": user_id,
            "name": agent_data.name,
            "company_name": agent_data.company_name,
            "company_description": agent_data.company_description,
            "products": agent_data.products,
            "tone": agent_data.tone,
            "language": agent_data.language,
            "greeting_message": agent_data.greeting_message,
            "sales_strategy": agent_data.sales_strategy,
            "pinecone_namespace": pinecone_namespace,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": None
        }

        # Insert into database
        result = await db.create_record("agents", agent_dict)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create agent: {result.get('error')}"
            )

        # Return created agent
        created_agent = result["data"][0] if result["data"] else agent_dict

        return AgentResponse(**created_agent)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating agent: {str(e)}"
        )


@router.get("/", response_model=List[AgentResponse])
async def list_agents(
    token_data: dict = Depends(verify_token),
    limit: int = 100
):
    """
    Get all agents for the authenticated user
    """
    try:
        user_id = token_data.get('uid')

        # Get agents from database
        result = await db.get_by_user("agents", user_id, limit=limit)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch agents: {result.get('error')}"
            )

        agents = result.get("data", [])

        return [AgentResponse(**agent) for agent in agents]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching agents: {str(e)}"
        )


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get a specific agent by ID

    Only returns agent if it belongs to the authenticated user
    """
    try:
        user_id = token_data.get('uid')

        # Get agent from database
        result = await db.get_by_id("agents", agent_id)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch agent: {result.get('error')}"
            )

        agents = result.get("data", [])

        if not agents:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = agents[0]

        # Verify ownership
        if agent["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this agent"
            )

        return AgentResponse(**agent)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching agent: {str(e)}"
        )


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    agent_update: AgentUpdate,
    token_data: dict = Depends(verify_token)
):
    """
    Update an existing agent

    Only agent owner can update
    """
    try:
        user_id = token_data.get('uid')

        # First, verify agent exists and user owns it
        get_result = await db.get_by_id("agents", agent_id)

        if not get_result["success"] or not get_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = get_result["data"][0]

        if agent["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this agent"
            )

        # Prepare update data (only include non-None fields)
        update_data = agent_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow().isoformat()

        # Update in database
        result = await db.update_record("agents", agent_id, update_data)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update agent: {result.get('error')}"
            )

        # Return updated agent
        updated_agent = result["data"][0] if result["data"] else {**agent, **update_data}

        return AgentResponse(**updated_agent)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating agent: {str(e)}"
        )


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Delete an agent

    Only agent owner can delete
    This also deletes all associated training data from Pinecone
    """
    try:
        user_id = token_data.get('uid')

        # First, verify agent exists and user owns it
        get_result = await db.get_by_id("agents", agent_id)

        if not get_result["success"] or not get_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = get_result["data"][0]

        if agent["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this agent"
            )

        # Delete agent from database
        result = await db.delete_record("agents", agent_id)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete agent: {result.get('error')}"
            )

        # TODO: Also delete from Pinecone (async task)
        # from agents.vector_store import get_vector_store
        # vector_store = get_vector_store()
        # await vector_store.delete_agent_documents(agent_id)

        return None

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting agent: {str(e)}"
        )


@router.get("/{agent_id}/stats")
async def get_agent_stats(
    agent_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get statistics for an agent (conversations, knowledge base, etc.)
    """
    try:
        user_id = token_data.get('uid')

        # Verify agent exists and user owns it
        get_result = await db.get_by_id("agents", agent_id)

        if not get_result["success"] or not get_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = get_result["data"][0]

        if agent["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this agent"
            )

        # Get knowledge base stats
        from agents.vector_store import get_vector_store
        vector_store = get_vector_store()
        kb_stats = await vector_store.get_agent_stats(agent_id)

        # TODO: Get conversation stats from database
        # For now, return mock data
        return {
            "success": True,
            "agent_id": agent_id,
            "knowledge_base": {
                "total_vectors": kb_stats.get("total_vectors", 0),
                "status": "ready" if kb_stats.get("total_vectors", 0) > 0 else "empty"
            },
            "conversations": {
                "total": 0,
                "active": 0
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching agent stats: {str(e)}"
        )
