"""
Training Router - Upload PDFs, URLs, and FAQs to train agents
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from database.models import TrainingDataCreate, TrainingDataResponse, PDFUploadResponse
from database.supabase_client import db
from routers.auth import verify_token
from agents.document_processor import get_document_processor
from datetime import datetime
import uuid
import json

router = APIRouter()

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/pdf", response_model=PDFUploadResponse)
async def upload_pdf(
    agent_id: str = Form(...),
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_token)
):
    """
    Upload a PDF file to train an agent

    Requires authentication and agent ownership
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
                detail="You don't have permission to train this agent"
            )

        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are allowed"
            )

        # Read file content
        content = await file.read()

        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024)}MB"
            )

        # Create training data record
        training_data_id = str(uuid.uuid4())
        training_record = {
            "id": training_data_id,
            "agent_id": agent_id,
            "type": "pdf",
            "status": "processing",
            "metadata": {"filename": file.filename},
            "created_at": datetime.utcnow().isoformat()
        }

        await db.create_record("training_data", training_record)

        # Process PDF
        doc_processor = get_document_processor()

        result = await doc_processor.process_pdf(
            agent_id=agent_id,
            pdf_content=content,
            metadata={"filename": file.filename, "training_id": training_data_id}
        )

        # Update training record status
        if result["success"]:
            await db.update_record("training_data", training_data_id, {
                "status": "completed",
                "metadata": {
                    "filename": file.filename,
                    "pages_processed": result.get("pages_processed", 0),
                    "chunks_created": result.get("chunks_created", 0)
                }
            })

            return PDFUploadResponse(
                success=True,
                message=f"PDF processed successfully. {result.get('chunks_created', 0)} chunks added to knowledge base.",
                training_data_id=training_data_id,
                chunks_created=result.get("chunks_created", 0)
            )
        else:
            await db.update_record("training_data", training_data_id, {
                "status": "failed",
                "metadata": {
                    "filename": file.filename,
                    "error": result.get("error")
                }
            })

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to process PDF")
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading PDF: {str(e)}"
        )


@router.post("/url")
async def train_from_url(
    training_data: TrainingDataCreate,
    token_data: dict = Depends(verify_token)
):
    """
    Train agent from a website URL

    Scrapes and processes content from the URL
    """
    try:
        user_id = token_data.get('uid')
        agent_id = training_data.agent_id

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
                detail="You don't have permission to train this agent"
            )

        # Validate URL
        if not training_data.url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL is required"
            )

        # Create training data record
        training_data_id = str(uuid.uuid4())
        training_record = {
            "id": training_data_id,
            "agent_id": agent_id,
            "type": "url",
            "status": "processing",
            "metadata": {"url": training_data.url},
            "created_at": datetime.utcnow().isoformat()
        }

        await db.create_record("training_data", training_record)

        # Process URL
        doc_processor = get_document_processor()

        result = await doc_processor.process_url(
            agent_id=agent_id,
            url=training_data.url,
            metadata={"training_id": training_data_id}
        )

        # Update training record status
        if result["success"]:
            await db.update_record("training_data", training_data_id, {
                "status": "completed",
                "metadata": {
                    "url": training_data.url,
                    "content_length": result.get("content_length", 0),
                    "chunks_created": result.get("chunks_created", 0)
                }
            })

            return {
                "success": True,
                "message": f"URL processed successfully. {result.get('chunks_created', 0)} chunks added to knowledge base.",
                "training_data_id": training_data_id,
                "chunks_created": result.get("chunks_created", 0)
            }
        else:
            await db.update_record("training_data", training_data_id, {
                "status": "failed",
                "metadata": {
                    "url": training_data.url,
                    "error": result.get("error")
                }
            })

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to process URL")
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing URL: {str(e)}"
        )


@router.post("/faq")
async def train_from_faq(
    agent_id: str = Form(...),
    faq_json: str = Form(...),
    token_data: dict = Depends(verify_token)
):
    """
    Train agent from FAQ items

    faq_json should be a JSON string with format:
    [{"question": "...", "answer": "..."}, ...]
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
                detail="You don't have permission to train this agent"
            )

        # Parse FAQ JSON
        try:
            faq_items = json.loads(faq_json)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format for FAQ items"
            )

        if not isinstance(faq_items, list) or len(faq_items) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="FAQ must be a non-empty list"
            )

        # Create training data record
        training_data_id = str(uuid.uuid4())
        training_record = {
            "id": training_data_id,
            "agent_id": agent_id,
            "type": "faq",
            "status": "processing",
            "metadata": {"item_count": len(faq_items)},
            "created_at": datetime.utcnow().isoformat()
        }

        await db.create_record("training_data", training_record)

        # Process FAQ
        doc_processor = get_document_processor()

        result = await doc_processor.process_faq(
            agent_id=agent_id,
            faq_items=faq_items,
            metadata={"training_id": training_data_id}
        )

        # Update training record status
        if result["success"]:
            await db.update_record("training_data", training_data_id, {
                "status": "completed",
                "metadata": {
                    "item_count": len(faq_items),
                    "chunks_created": result.get("chunks_created", 0)
                }
            })

            return {
                "success": True,
                "message": f"FAQ processed successfully. {result.get('chunks_created', 0)} chunks added to knowledge base.",
                "training_data_id": training_data_id,
                "chunks_created": result.get("chunks_created", 0)
            }
        else:
            await db.update_record("training_data", training_data_id, {
                "status": "failed",
                "metadata": {
                    "item_count": len(faq_items),
                    "error": result.get("error")
                }
            })

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to process FAQ")
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing FAQ: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing FAQ: {str(e)}"
        )


@router.get("/{agent_id}/data", response_model=List[TrainingDataResponse])
async def get_training_data(
    agent_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get all training data for an agent
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

        # Get training data
        result = await db.execute_query(
            "training_data",
            "select",
            filters={"agent_id": agent_id},
            order="created_at",
            desc=True
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch training data"
            )

        training_data = result.get("data", [])

        return [TrainingDataResponse(
            id=item["id"],
            agent_id=item["agent_id"],
            type=item["type"],
            status=item["status"],
            chunks_created=item.get("metadata", {}).get("chunks_created"),
            error=item.get("metadata", {}).get("error"),
            created_at=item["created_at"]
        ) for item in training_data]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching training data: {str(e)}"
        )


@router.delete("/{agent_id}/data", status_code=status.HTTP_204_NO_CONTENT)
async def clear_training_data(
    agent_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Clear all training data for an agent

    Deletes from both database and Pinecone
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

        # Delete from Pinecone
        doc_processor = get_document_processor()
        await doc_processor.clear_agent_knowledge(agent_id)

        # Delete from database
        await db.execute_query(
            "training_data",
            "delete",
            filters={"agent_id": agent_id}
        )

        return None

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing training data: {str(e)}"
        )
