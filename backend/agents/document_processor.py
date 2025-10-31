"""
Document Processor - Handle PDF uploads, URL scraping, and FAQ training
"""

from typing import List, Dict, Optional
from PyPDF2 import PdfReader
from bs4 import BeautifulSoup
import requests
import io
from .vector_store import get_vector_store


class DocumentProcessor:
    """Process various document types for agent training"""

    def __init__(self):
        """Initialize document processor"""
        self.vector_store = get_vector_store()

    async def process_pdf(
        self,
        agent_id: str,
        pdf_content: bytes,
        metadata: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Process PDF file and add to vector store

        Args:
            agent_id: Agent to train
            pdf_content: PDF file content as bytes
            metadata: Optional metadata

        Returns:
            Dict with processing results
        """
        try:
            # Read PDF
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PdfReader(pdf_file)

            # Extract text from all pages
            texts = []
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text.strip():  # Only add non-empty pages
                    texts.append(text)

            if not texts:
                return {
                    "success": False,
                    "error": "No text could be extracted from PDF"
                }

            # Add metadata
            doc_metadata = {
                **(metadata or {}),
                "type": "pdf",
                "pages": len(pdf_reader.pages),
                "extracted_pages": len(texts)
            }

            # Add to vector store
            chunks_created = await self.vector_store.add_documents(
                agent_id=agent_id,
                texts=texts,
                metadata=doc_metadata
            )

            return {
                "success": True,
                "pages_processed": len(texts),
                "chunks_created": chunks_created
            }

        except Exception as e:
            print(f"Error processing PDF: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to process PDF: {str(e)}"
            }

    async def process_url(
        self,
        agent_id: str,
        url: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Scrape URL and add content to vector store

        Args:
            agent_id: Agent to train
            url: URL to scrape
            metadata: Optional metadata

        Returns:
            Dict with processing results
        """
        try:
            # Fetch URL content
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()

            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')

            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()

            # Extract text
            text = soup.get_text(separator='\n', strip=True)

            # Clean up text
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            cleaned_text = '\n'.join(lines)

            if not cleaned_text or len(cleaned_text) < 100:
                return {
                    "success": False,
                    "error": "Not enough content extracted from URL"
                }

            # Add metadata
            doc_metadata = {
                **(metadata or {}),
                "type": "url",
                "source_url": url,
                "title": soup.title.string if soup.title else "No title"
            }

            # Add to vector store
            chunks_created = await self.vector_store.add_documents(
                agent_id=agent_id,
                texts=[cleaned_text],
                metadata=doc_metadata
            )

            return {
                "success": True,
                "url": url,
                "content_length": len(cleaned_text),
                "chunks_created": chunks_created
            }

        except requests.RequestException as e:
            return {
                "success": False,
                "error": f"Failed to fetch URL: {str(e)}"
            }
        except Exception as e:
            print(f"Error processing URL: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to process URL: {str(e)}"
            }

    async def process_faq(
        self,
        agent_id: str,
        faq_items: List[Dict[str, str]],
        metadata: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Process FAQ items and add to vector store

        Args:
            agent_id: Agent to train
            faq_items: List of dicts with 'question' and 'answer'
            metadata: Optional metadata

        Returns:
            Dict with processing results
        """
        try:
            # Format FAQ items as text
            texts = []
            for item in faq_items:
                question = item.get("question", "")
                answer = item.get("answer", "")

                if question and answer:
                    faq_text = f"Q: {question}\n\nA: {answer}"
                    texts.append(faq_text)

            if not texts:
                return {
                    "success": False,
                    "error": "No valid FAQ items provided"
                }

            # Add metadata
            doc_metadata = {
                **(metadata or {}),
                "type": "faq",
                "total_items": len(texts)
            }

            # Add to vector store
            chunks_created = await self.vector_store.add_documents(
                agent_id=agent_id,
                texts=texts,
                metadata=doc_metadata
            )

            return {
                "success": True,
                "faq_items_processed": len(texts),
                "chunks_created": chunks_created
            }

        except Exception as e:
            print(f"Error processing FAQ: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to process FAQ: {str(e)}"
            }

    async def process_text(
        self,
        agent_id: str,
        text: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Process raw text and add to vector store

        Args:
            agent_id: Agent to train
            text: Raw text content
            metadata: Optional metadata

        Returns:
            Dict with processing results
        """
        try:
            if not text or len(text.strip()) < 50:
                return {
                    "success": False,
                    "error": "Text is too short (minimum 50 characters)"
                }

            # Add metadata
            doc_metadata = {
                **(metadata or {}),
                "type": "text",
                "length": len(text)
            }

            # Add to vector store
            chunks_created = await self.vector_store.add_documents(
                agent_id=agent_id,
                texts=[text],
                metadata=doc_metadata
            )

            return {
                "success": True,
                "text_length": len(text),
                "chunks_created": chunks_created
            }

        except Exception as e:
            print(f"Error processing text: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to process text: {str(e)}"
            }

    async def get_agent_knowledge_stats(self, agent_id: str) -> Dict[str, any]:
        """
        Get statistics about agent's knowledge base

        Args:
            agent_id: Agent ID

        Returns:
            Dict with stats
        """
        try:
            stats = await self.vector_store.get_agent_stats(agent_id)
            return stats
        except Exception as e:
            print(f"Error getting knowledge stats: {str(e)}")
            return {"total_vectors": 0, "agent_id": agent_id}

    async def clear_agent_knowledge(self, agent_id: str) -> bool:
        """
        Clear all knowledge for an agent

        Args:
            agent_id: Agent ID

        Returns:
            bool: Success status
        """
        try:
            await self.vector_store.delete_agent_documents(agent_id)
            return True
        except Exception as e:
            print(f"Error clearing knowledge: {str(e)}")
            return False


# Singleton instance
_document_processor: Optional[DocumentProcessor] = None


def get_document_processor() -> DocumentProcessor:
    """Get document processor instance (singleton)"""
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor()
    return _document_processor
