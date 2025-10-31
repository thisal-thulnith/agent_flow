"""
Products Router - Product catalog management with photos and prices
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List
from database.models import ProductCreate, ProductUpdate, ProductResponse
from database.supabase_client import db
from routers.auth import verify_token
from datetime import datetime
import uuid
import os
import shutil
from pathlib import Path

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_token)
):
    """Upload a product image and return the URL"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
            )

        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = UPLOAD_DIR / unique_filename

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return URL (this will be served by FastAPI static files)
        image_url = f"/uploads/products/{unique_filename}"

        return {"image_url": image_url}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    token_data: dict = Depends(verify_token)
):
    """Create a new product with photo, price, and details"""
    try:
        user_id = token_data.get('uid')

        # Verify agent exists and belongs to user
        agent_result = await db.get_by_id("agents", product_data.agent_id)
        if not agent_result["success"] or not agent_result.get("data"):
            raise HTTPException(status_code=404, detail="Agent not found")

        agent = agent_result["data"][0]
        if agent["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Create product
        product_id = str(uuid.uuid4())
        product_dict = {
            "id": product_id,
            "agent_id": product_data.agent_id,
            "name": product_data.name,
            "description": product_data.description,
            "detailed_description": product_data.detailed_description,
            "price": product_data.price,
            "currency": product_data.currency,
            "image_url": product_data.image_url,
            "category": product_data.category,
            "features": product_data.features,
            "specifications": product_data.specifications,
            "stock_status": product_data.stock_status,
            "sku": product_data.sku,
            "is_featured": product_data.is_featured,
            "is_active": product_data.is_active,
            "created_at": datetime.utcnow().isoformat()
        }

        result = await db.create_record("products", product_dict)

        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Failed to create product: {result.get('error')}")

        return ProductResponse(**result["data"][0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating product: {str(e)}")


@router.get("/agent/{agent_id}", response_model=List[ProductResponse])
async def list_products(
    agent_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get all products for an agent"""
    try:
        user_id = token_data.get('uid')

        # Verify agent ownership
        agent_result = await db.get_by_id("agents", agent_id)
        if not agent_result["success"] or not agent_result.get("data"):
            raise HTTPException(status_code=404, detail="Agent not found")

        if agent_result["data"][0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Get products
        result = await db.execute_query("products", "select", filters={"agent_id": agent_id})

        if not result["success"]:
            # Return empty list if no products found, don't error
            return []

        # Return empty list if no data
        if not result.get("data"):
            return []

        return [ProductResponse(**product) for product in result.get("data", [])]

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching products: {e}")
        # Return empty list instead of error - products are optional
        return []


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    token_data: dict = Depends(verify_token)
):
    """Update product details"""
    try:
        user_id = token_data.get('uid')

        # Get product and verify ownership
        product_result = await db.get_by_id("products", product_id)
        if not product_result["success"] or not product_result.get("data"):
            raise HTTPException(status_code=404, detail="Product not found")

        product = product_result["data"][0]

        # Verify agent ownership
        agent_result = await db.get_by_id("agents", product["agent_id"])
        if agent_result["data"][0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Update product
        update_data = product_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow().isoformat()

        result = await db.update_record("products", product_id, update_data)

        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Failed to update product")

        return ProductResponse(**result["data"][0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a product"""
    try:
        user_id = token_data.get('uid')

        # Get product and verify ownership
        product_result = await db.get_by_id("products", product_id)
        if not product_result["success"] or not product_result.get("data"):
            raise HTTPException(status_code=404, detail="Product not found")

        product = product_result["data"][0]

        # Verify agent ownership
        agent_result = await db.get_by_id("agents", product["agent_id"])
        if agent_result["data"][0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Delete product
        result = await db.delete_record("products", product_id)

        if not result["success"]:
            raise HTTPException(status_code=500, detail="Failed to delete product")

        return None

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")
