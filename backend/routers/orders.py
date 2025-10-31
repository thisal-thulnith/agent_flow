"""
Orders Router - Handle order creation, management, and tracking
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import random

from routers.auth import verify_token
from database.supabase_client import db

router = APIRouter()


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ShippingAddress(BaseModel):
    street: str
    city: str
    state: str
    zip: str
    country: str = "USA"


class OrderItem(BaseModel):
    product_id: Optional[str] = None
    name: str
    quantity: int
    price: float
    image: Optional[str] = None


class CreateOrderRequest(BaseModel):
    conversation_id: Optional[str] = None
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    shipping_address: ShippingAddress
    items: List[OrderItem]
    total_amount: float
    customer_notes: Optional[str] = None
    payment_method: Optional[str] = None


class UpdateOrderStatusRequest(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    estimated_delivery: Optional[str] = None
    note: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_order_number() -> str:
    """Generate unique order number in format ORD-YYYY-NNNNNN"""
    year = datetime.now().year
    random_num = random.randint(1, 999999)
    return f"ORD-{year}-{random_num:06d}"


def add_status_to_history(order: dict, new_status: str, note: Optional[str] = None) -> list:
    """Add new status to order history"""
    history = order.get("status_history", [])
    if not isinstance(history, list):
        history = []

    history.append({
        "status": new_status,
        "timestamp": datetime.utcnow().isoformat(),
        "note": note
    })

    return history


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: CreateOrderRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new order

    This endpoint is called by AI agents when a customer places an order during chat
    """
    try:
        user_id = token_data.get('uid')

        # If conversation_id provided, verify it exists and get agent_id
        agent_id = None
        if order_data.conversation_id:
            supabase = db.get_client()
            conv_result = supabase.table("conversations")\
                .select("agent_id")\
                .eq("id", order_data.conversation_id)\
                .execute()

            if conv_result.data and len(conv_result.data) > 0:
                agent_id = conv_result.data[0]["agent_id"]

                # Verify user owns this agent
                agent_check = await db.get_by_id("agents", agent_id)
                if not agent_check["success"] or agent_check["data"][0]["user_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this agent"
                    )

        # If no agent_id from conversation, we need it from request or use first agent
        if not agent_id:
            # Get user's first agent (you might want to pass agent_id explicitly)
            agents_result = await db.get_by_user("agents", user_id)
            if agents_result["success"] and agents_result["data"]:
                agent_id = agents_result["data"][0]["id"]
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No agent found for this user"
                )

        # Generate unique order number
        order_number = generate_order_number()

        # Prepare order data
        supabase = db.get_client()

        # Initial status history
        status_history = [{
            "status": "pending",
            "timestamp": datetime.utcnow().isoformat(),
            "note": "Order created"
        }]

        order_record = {
            "order_number": order_number,
            "agent_id": agent_id,
            "conversation_id": order_data.conversation_id,
            "user_id": user_id,
            "customer_name": order_data.customer_name,
            "customer_email": order_data.customer_email,
            "customer_phone": order_data.customer_phone,
            "shipping_address": order_data.shipping_address.dict(),
            "items": [item.dict() for item in order_data.items],
            "total_amount": order_data.total_amount,
            "customer_notes": order_data.customer_notes,
            "payment_method": order_data.payment_method,
            "status": "pending",
            "payment_status": "pending",
            "status_history": status_history,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        # Insert into database
        result = supabase.table("orders")\
            .insert(order_record)\
            .execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create order"
            )

        order = result.data[0]

        return {
            "success": True,
            "order": {
                "id": order["id"],
                "order_number": order["order_number"],
                "status": order["status"],
                "total_amount": float(order["total_amount"]),
                "tracking_url": f"/track/{order['order_number']}",
                "created_at": order["created_at"]
            },
            "message": f"Order {order_number} created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating order: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating order: {str(e)}"
        )


@router.get("/")
async def get_orders(
    agent_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    token_data: dict = Depends(verify_token)
):
    """
    Get all orders for user's agents

    Can filter by agent_id and status
    """
    try:
        user_id = token_data.get('uid')

        supabase = db.get_client()

        # Build query
        query = supabase.table("orders")\
            .select("*")\
            .eq("user_id", user_id)

        # Apply filters
        if agent_id:
            # Verify user owns this agent
            agent_check = await db.get_by_id("agents", agent_id)
            if not agent_check["success"] or agent_check["data"][0]["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this agent"
                )
            query = query.eq("agent_id", agent_id)

        if status_filter:
            query = query.eq("status", status_filter)

        # Order by most recent first
        query = query.order("created_at", desc=True)

        # Apply pagination
        query = query.range(offset, offset + limit - 1)

        result = query.execute()

        orders = result.data or []

        # Get total count for pagination
        count_query = supabase.table("orders")\
            .select("id", count="exact")\
            .eq("user_id", user_id)

        if agent_id:
            count_query = count_query.eq("agent_id", agent_id)
        if status_filter:
            count_query = count_query.eq("status", status_filter)

        count_result = count_query.execute()
        total = count_result.count or 0

        return {
            "success": True,
            "orders": orders,
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
        print(f"Error fetching orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching orders: {str(e)}"
        )


@router.get("/{order_id}")
async def get_order_details(
    order_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get detailed information for a specific order
    """
    try:
        user_id = token_data.get('uid')

        supabase = db.get_client()

        result = supabase.table("orders")\
            .select("*")\
            .eq("id", order_id)\
            .execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        order = result.data[0]

        # Verify user owns this order
        if order["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this order"
            )

        return {
            "success": True,
            "order": order
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching order details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching order details: {str(e)}"
        )


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    update_data: UpdateOrderStatusRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Update order status and tracking information
    """
    try:
        user_id = token_data.get('uid')

        supabase = db.get_client()

        # Get current order
        result = supabase.table("orders")\
            .select("*")\
            .eq("id", order_id)\
            .execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        order = result.data[0]

        # Verify user owns this order
        if order["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this order"
            )

        # Validate status
        valid_statuses = ["pending", "confirmed", "processing", "packaged", "shipped", "delivered", "cancelled"]
        if update_data.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

        # Add to status history
        status_history = add_status_to_history(order, update_data.status, update_data.note)

        # Prepare update
        update_fields = {
            "status": update_data.status,
            "status_history": status_history,
            "updated_at": datetime.utcnow().isoformat()
        }

        if update_data.tracking_number:
            update_fields["tracking_number"] = update_data.tracking_number

        if update_data.carrier:
            update_fields["carrier"] = update_data.carrier

        if update_data.estimated_delivery:
            update_fields["estimated_delivery"] = update_data.estimated_delivery

        if update_data.status == "delivered":
            update_fields["delivered_at"] = datetime.utcnow().isoformat()

        # Update order
        update_result = supabase.table("orders")\
            .update(update_fields)\
            .eq("id", order_id)\
            .execute()

        if not update_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order"
            )

        updated_order = update_result.data[0]

        return {
            "success": True,
            "order": updated_order,
            "message": f"Order status updated to {update_data.status}"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating order status: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating order status: {str(e)}"
        )


@router.get("/track/{order_number}", include_in_schema=True)
async def track_order_public(order_number: str):
    """
    Public endpoint to track order by order number

    NO AUTHENTICATION REQUIRED - Customers can track their orders
    """
    try:
        supabase = db.get_client()

        result = supabase.table("orders")\
            .select("*")\
            .eq("order_number", order_number)\
            .execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        order = result.data[0]

        # Build status timeline
        status_timeline = []
        status_map = {
            "pending": "Order Placed",
            "confirmed": "Order Confirmed",
            "processing": "Processing",
            "packaged": "Packaged",
            "shipped": "Shipped",
            "delivered": "Delivered"
        }

        history = order.get("status_history", [])
        current_status = order.get("status", "pending")

        # Create timeline with all possible statuses
        for status_key in ["pending", "confirmed", "processing", "packaged", "shipped", "delivered"]:
            # Find if this status exists in history
            status_entry = next((h for h in history if h["status"] == status_key), None)

            timeline_entry = {
                "status": status_map.get(status_key, status_key.capitalize()),
                "completed": status_entry is not None,
                "current": status_key == current_status
            }

            if status_entry:
                timeline_entry["date"] = status_entry.get("timestamp", "")
                timeline_entry["note"] = status_entry.get("note", "")
            elif status_key == "delivered" and current_status != "delivered":
                timeline_entry["date"] = order.get("estimated_delivery", "")
                timeline_entry["note"] = "Expected"

            status_timeline.append(timeline_entry)

        # Return limited customer info for privacy
        customer_name_parts = order["customer_name"].split()
        customer_name_safe = customer_name_parts[0] + " " + customer_name_parts[-1][0] + "." if len(customer_name_parts) > 1 else order["customer_name"]

        return {
            "success": True,
            "order": {
                "order_number": order["order_number"],
                "status": order["status"],
                "customer_name": customer_name_safe,
                "items": order["items"],
                "total_amount": float(order["total_amount"]),
                "currency": order.get("currency", "USD"),
                "tracking_number": order.get("tracking_number"),
                "carrier": order.get("carrier"),
                "estimated_delivery": order.get("estimated_delivery"),
                "created_at": order["created_at"],
                "shipping_address": order.get("shipping_address"),
                "status_timeline": status_timeline
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error tracking order: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error tracking order: {str(e)}"
        )


@router.get("/stats/summary")
async def get_order_stats(
    agent_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get order statistics summary
    """
    try:
        user_id = token_data.get('uid')

        supabase = db.get_client()

        # Build query
        query = supabase.table("orders")\
            .select("*")\
            .eq("user_id", user_id)

        if agent_id:
            # Verify user owns this agent
            agent_check = await db.get_by_id("agents", agent_id)
            if not agent_check["success"] or agent_check["data"][0]["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this agent"
                )
            query = query.eq("agent_id", agent_id)

        result = query.execute()
        orders = result.data or []

        # Calculate stats
        total_orders = len(orders)
        total_revenue = sum(float(order["total_amount"]) for order in orders)

        pending_orders = len([o for o in orders if o["status"] == "pending"])
        processing_orders = len([o for o in orders if o["status"] in ["confirmed", "processing", "packaged"]])
        shipped_orders = len([o for o in orders if o["status"] == "shipped"])
        delivered_orders = len([o for o in orders if o["status"] == "delivered"])
        cancelled_orders = len([o for o in orders if o["status"] == "cancelled"])

        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0

        return {
            "success": True,
            "stats": {
                "total_orders": total_orders,
                "total_revenue": round(total_revenue, 2),
                "pending_orders": pending_orders,
                "processing_orders": processing_orders,
                "shipped_orders": shipped_orders,
                "delivered_orders": delivered_orders,
                "cancelled_orders": cancelled_orders,
                "avg_order_value": round(avg_order_value, 2)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching order stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching order stats: {str(e)}"
        )
