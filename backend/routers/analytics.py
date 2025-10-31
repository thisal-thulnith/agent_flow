"""
Analytics Router - Get statistics and analytics for agents
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List, Optional
from database.supabase_client import db
from routers.auth import verify_token
from datetime import datetime, timedelta
import csv
import io

router = APIRouter()


@router.get("/{agent_id}")
async def get_agent_analytics(
    agent_id: str,
    days: int = 30,
    token_data: dict = Depends(verify_token)
):
    """
    Get analytics for a specific agent

    Args:
        agent_id: Agent ID
        days: Number of days to include (default: 30)
    """
    try:
        user_id = token_data.get('uid')

        # Verify agent exists and user owns it
        agent_result = await db.get_by_id("agents", agent_id)

        if not agent_result["success"] or not agent_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = agent_result["data"][0]

        if agent["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Get date range
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)

        # Get analytics from database
        supabase = db.get_client()

        # Total conversations
        conversations_result = supabase.table("conversations")\
            .select("id", count="exact")\
            .eq("agent_id", agent_id)\
            .execute()

        total_conversations = conversations_result.count or 0

        # Total messages
        conversations_data = supabase.table("conversations")\
            .select("messages")\
            .eq("agent_id", agent_id)\
            .execute()

        total_messages = sum(
            len(conv.get("messages", []))
            for conv in (conversations_data.data or [])
        )

        # Leads captured (conversations with lead_info)
        leads_result = supabase.table("conversations")\
            .select("lead_info", count="exact")\
            .eq("agent_id", agent_id)\
            .not_.is_("lead_info", "null")\
            .execute()

        leads_captured = leads_result.count or 0

        # Daily stats
        analytics_result = supabase.table("analytics")\
            .select("*")\
            .eq("agent_id", agent_id)\
            .gte("date", start_date.isoformat())\
            .lte("date", end_date.isoformat())\
            .order("date")\
            .execute()

        daily_stats = analytics_result.data or []

        # Average conversation length
        avg_length = total_messages / total_conversations if total_conversations > 0 else 0

        # Get popular questions (from conversation messages)
        # This is a simplified version - in production, use NLP to extract questions
        popular_questions = []

        return {
            "success": True,
            "agent_id": agent_id,
            "agent_name": agent.get("name"),
            "summary": {
                "total_conversations": total_conversations,
                "total_messages": total_messages,
                "leads_captured": leads_captured,
                "conversions": 0,  # TODO: Implement conversion tracking
                "average_conversation_length": round(avg_length, 1)
            },
            "daily_stats": daily_stats,
            "popular_questions": popular_questions,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching analytics: {str(e)}"
        )


@router.get("/{agent_id}/conversations")
async def get_agent_conversations(
    agent_id: str,
    limit: int = 50,
    offset: int = 0,
    token_data: dict = Depends(verify_token)
):
    """
    Get all conversations for an agent

    Useful for reviewing chat history
    """
    try:
        user_id = token_data.get('uid')

        # Verify agent exists and user owns it
        agent_result = await db.get_by_id("agents", agent_id)

        if not agent_result["success"] or not agent_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = agent_result["data"][0]

        if agent["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Get conversations
        supabase = db.get_client()

        conversations_result = supabase.table("conversations")\
            .select("*")\
            .eq("agent_id", agent_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        conversations = conversations_result.data or []

        # Count total
        count_result = supabase.table("conversations")\
            .select("id", count="exact")\
            .eq("agent_id", agent_id)\
            .execute()

        total = count_result.count or 0

        return {
            "success": True,
            "conversations": conversations,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching conversations: {str(e)}"
        )


@router.get("/{agent_id}/leads")
async def get_agent_leads(
    agent_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get all leads captured by an agent

    Returns conversations that have lead_info
    """
    try:
        user_id = token_data.get('uid')

        # Verify agent exists and user owns it
        agent_result = await db.get_by_id("agents", agent_id)

        if not agent_result["success"] or not agent_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = agent_result["data"][0]

        if agent["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Get conversations with lead info
        supabase = db.get_client()

        leads_result = supabase.table("conversations")\
            .select("*")\
            .eq("agent_id", agent_id)\
            .not_.is_("lead_info", "null")\
            .order("created_at", desc=True)\
            .execute()

        conversations = leads_result.data or []

        # Extract lead info
        leads = []
        for conv in conversations:
            lead_info = conv.get("lead_info", {})
            if lead_info:
                leads.append({
                    "conversation_id": conv["id"],
                    "session_id": conv["session_id"],
                    "channel": conv["channel"],
                    "name": lead_info.get("name"),
                    "email": lead_info.get("email"),
                    "phone": lead_info.get("phone"),
                    "interest_level": lead_info.get("interest_level"),
                    "captured_at": conv["created_at"]
                })

        return {
            "success": True,
            "leads": leads,
            "total": len(leads)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching leads: {str(e)}"
        )


@router.get("/{agent_id}/leads/export")
async def export_leads_csv(
    agent_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Export leads to CSV file

    Returns a downloadable CSV file
    """
    try:
        user_id = token_data.get('uid')

        # Verify agent exists and user owns it
        agent_result = await db.get_by_id("agents", agent_id)

        if not agent_result["success"] or not agent_result.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )

        agent = agent_result["data"][0]

        if agent["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Get leads (reuse the leads endpoint logic)
        supabase = db.get_client()

        leads_result = supabase.table("conversations")\
            .select("*")\
            .eq("agent_id", agent_id)\
            .not_.is_("lead_info", "null")\
            .order("created_at", desc=True)\
            .execute()

        conversations = leads_result.data or []

        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            "Date",
            "Name",
            "Email",
            "Phone",
            "Interest Level",
            "Channel",
            "Session ID"
        ])

        # Write data
        for conv in conversations:
            lead_info = conv.get("lead_info", {})
            if lead_info:
                writer.writerow([
                    conv["created_at"],
                    lead_info.get("name", ""),
                    lead_info.get("email", ""),
                    lead_info.get("phone", ""),
                    lead_info.get("interest_level", ""),
                    conv["channel"],
                    conv["session_id"]
                ])

        # Return CSV as download
        csv_data = output.getvalue()
        output.close()

        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=leads_{agent_id}_{datetime.utcnow().date()}.csv"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting leads: {str(e)}"
        )


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    token_data: dict = Depends(verify_token)
):
    """
    Get summary statistics for all user's agents

    Shows on main dashboard
    """
    try:
        user_id = token_data.get('uid')

        # Get all user's agents
        agents_result = await db.get_by_user("agents", user_id)

        if not agents_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch agents"
            )

        agents = agents_result.get("data", [])
        agent_ids = [agent["id"] for agent in agents]

        if not agent_ids:
            return {
                "success": True,
                "summary": {
                    "total_agents": 0,
                    "total_conversations": 0,
                    "total_leads": 0,
                    "active_agents": 0
                }
            }

        # Get total conversations across all agents
        supabase = db.get_client()

        total_conversations = 0
        total_leads = 0

        for agent_id in agent_ids:
            # Conversations
            conv_result = supabase.table("conversations")\
                .select("id", count="exact")\
                .eq("agent_id", agent_id)\
                .execute()

            total_conversations += (conv_result.count or 0)

            # Leads
            leads_result = supabase.table("conversations")\
                .select("id", count="exact")\
                .eq("agent_id", agent_id)\
                .not_.is_("lead_info", "null")\
                .execute()

            total_leads += (leads_result.count or 0)

        # Active agents
        active_agents = sum(1 for agent in agents if agent.get("is_active", False))

        return {
            "success": True,
            "summary": {
                "total_agents": len(agents),
                "total_conversations": total_conversations,
                "total_leads": total_leads,
                "active_agents": active_agents
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard summary: {str(e)}"
        )


@router.get("/dashboard/advanced")
async def get_advanced_analytics(
    days: int = 30,
    agent_id: str = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get advanced analytics for user's agents

    Parameters:
    - days: Number of days to analyze (default 30)
    - agent_id: Optional agent ID to filter analytics for specific agent
                If not provided, returns analytics for all agents

    Includes:
    - Peak hours analysis
    - Agent performance comparison
    - Conversion funnel
    - Trend analysis
    """
    try:
        user_id = token_data.get('uid')

        # Get all user's agents
        agents_result = await db.get_by_user("agents", user_id)

        if not agents_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch agents"
            )

        agents = agents_result.get("data", [])

        # Filter for specific agent if agent_id provided
        if agent_id:
            agents = [agent for agent in agents if agent["id"] == agent_id]
            if not agents:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found or doesn't belong to user"
                )

        agent_ids = [agent["id"] for agent in agents]

        if not agent_ids:
            return {
                "success": True,
                "peak_hours": [],
                "agent_performance": [],
                "conversion_funnel": {},
                "daily_trends": [],
                "filtered_agent": agent_id
            }

        supabase = db.get_client()

        # Get date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Fetch all conversations for analysis
        all_conversations = []
        agent_performance = []

        for agent in agents:
            current_agent_id = agent["id"]

            # Get conversations for this agent
            conv_result = supabase.table("conversations")\
                .select("*")\
                .eq("agent_id", current_agent_id)\
                .gte("created_at", start_date.isoformat())\
                .execute()

            conversations = conv_result.data or []
            all_conversations.extend(conversations)

            # Calculate metrics per agent
            total_convs = len(conversations)
            leads = [c for c in conversations if c.get("lead_info")]
            total_messages = sum(len(c.get("messages", [])) for c in conversations)

            avg_duration = total_messages / total_convs if total_convs > 0 else 0
            conversion_rate = (len(leads) / total_convs * 100) if total_convs > 0 else 0

            agent_performance.append({
                "agent_id": current_agent_id,
                "agent_name": agent.get("name", "Unknown"),
                "total_conversations": total_convs,
                "total_leads": len(leads),
                "conversion_rate": round(conversion_rate, 1),
                "avg_messages": round(avg_duration, 1)
            })

        # Peak hours analysis (hour of day when most chats happen)
        peak_hours = [0] * 24  # 24 hours
        for conv in all_conversations:
            try:
                created_at = datetime.fromisoformat(conv["created_at"].replace('Z', '+00:00'))
                hour = created_at.hour
                peak_hours[hour] += 1
            except:
                pass

        peak_hours_data = [
            {"hour": i, "conversations": count}
            for i, count in enumerate(peak_hours)
        ]

        # Daily trends
        daily_data = {}
        for conv in all_conversations:
            try:
                created_at = datetime.fromisoformat(conv["created_at"].replace('Z', '+00:00'))
                date_key = created_at.date().isoformat()

                if date_key not in daily_data:
                    daily_data[date_key] = {"conversations": 0, "leads": 0}

                daily_data[date_key]["conversations"] += 1
                if conv.get("lead_info"):
                    daily_data[date_key]["leads"] += 1
            except:
                pass

        daily_trends = [
            {"date": date, **stats}
            for date, stats in sorted(daily_data.items())
        ]

        # Conversion funnel
        total_visitors = len(all_conversations)
        engaged = sum(1 for c in all_conversations if len(c.get("messages", [])) > 3)
        qualified = sum(1 for c in all_conversations if c.get("lead_info"))
        converted = sum(1 for c in all_conversations if c.get("lead_info", {}).get("interest_level") in ["high", "converted"])

        conversion_funnel = {
            "visitors": total_visitors,
            "engaged": engaged,
            "qualified": qualified,
            "converted": converted,
            "engagement_rate": round(engaged / total_visitors * 100, 1) if total_visitors > 0 else 0,
            "qualification_rate": round(qualified / total_visitors * 100, 1) if total_visitors > 0 else 0,
            "conversion_rate": round(converted / total_visitors * 100, 1) if total_visitors > 0 else 0
        }

        return {
            "success": True,
            "peak_hours": peak_hours_data,
            "agent_performance": sorted(agent_performance, key=lambda x: x["total_conversations"], reverse=True),
            "conversion_funnel": conversion_funnel,
            "daily_trends": daily_trends[-30:],  # Last 30 days
            "period": {
                "start_date": start_date.date().isoformat(),
                "end_date": end_date.date().isoformat(),
                "days": days
            },
            "filtered_agent": agent_id  # Return the filter that was applied
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching advanced analytics: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching advanced analytics: {str(e)}"
        )
