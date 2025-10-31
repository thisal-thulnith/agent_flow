"""
Vector Store Service - Qdrant integration for RAG
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from typing import List, Dict, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from config import settings
import hashlib
import uuid


class VectorStoreService:
    """Service for managing vector embeddings in Qdrant"""
    _initialized = False

    def __init__(self):
        """Initialize Qdrant client"""
        # Check if using cloud or local
        if hasattr(settings, 'QDRANT_URL') and settings.QDRANT_URL and settings.QDRANT_URL != "http://localhost:6333":
            # Cloud mode
            self.client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY
            )
            if not VectorStoreService._initialized:
                print(f"✅ Connected to Qdrant Cloud: {settings.QDRANT_URL}")
        else:
            # Local mode
            self.client = QdrantClient(
                host="localhost",
                port=6333
            )
            if not VectorStoreService._initialized:
                print("✅ Connected to Qdrant Local: http://localhost:6333")

        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self.embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)

        # Text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
        )

        # Initialize or connect to collection
        self._ensure_collection_exists()
        VectorStoreService._initialized = True

    def _ensure_collection_exists(self):
        """Ensure Qdrant collection exists, create if not"""
        try:
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_names = [col.name for col in collections]

            if self.collection_name not in collection_names:
                print(f"Creating Qdrant collection: {self.collection_name}")

                # Create collection with vector configuration
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=1536,  # OpenAI embedding dimension
                        distance=Distance.COSINE
                    )
                )

            if not VectorStoreService._initialized:
                print(f"✅ Qdrant collection ready: {self.collection_name}")

        except Exception as e:
            print(f"Error initializing Qdrant: {str(e)}")
            raise

    def _generate_chunk_id(self, agent_id: str, text: str, index: int) -> str:
        """Generate unique ID for a text chunk"""
        content_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        return f"{agent_id}_{index}_{content_hash}"

    async def add_documents(
        self,
        agent_id: str,
        texts: List[str],
        metadata: Optional[Dict] = None
    ) -> int:
        """
        Add documents to vector store for an agent

        Args:
            agent_id: Agent namespace/ID
            texts: List of text documents to add
            metadata: Optional metadata to attach to vectors

        Returns:
            int: Number of chunks created
        """
        try:
            all_chunks = []

            # Split each document into chunks
            for doc_idx, text in enumerate(texts):
                chunks = self.text_splitter.split_text(text)

                for chunk_idx, chunk in enumerate(chunks):
                    all_chunks.append({
                        "text": chunk,
                        "metadata": {
                            **(metadata or {}),
                            "agent_id": agent_id,
                            "doc_index": doc_idx,
                            "chunk_index": chunk_idx
                        }
                    })

            # Generate embeddings for all chunks
            chunk_texts = [chunk["text"] for chunk in all_chunks]
            embeddings = await self.embeddings.aembed_documents(chunk_texts)

            # Prepare points for upsert
            points = []
            for idx, (chunk, embedding) in enumerate(zip(all_chunks, embeddings)):
                point_id = str(uuid.uuid4())  # Use UUID for Qdrant

                points.append(
                    PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload={
                            **chunk["metadata"],
                            "text": chunk["text"]
                        }
                    )
                )

            # Upsert to Qdrant in batches
            batch_size = 100
            for i in range(0, len(points), batch_size):
                batch = points[i:i + batch_size]
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=batch
                )

            print(f"✅ Added {len(points)} chunks for agent {agent_id}")
            return len(points)

        except Exception as e:
            print(f"Error adding documents to vector store: {str(e)}")
            raise

    async def search(
        self,
        agent_id: str,
        query: str,
        top_k: int = None
    ) -> List[Dict[str, any]]:
        """
        Search for relevant documents

        Args:
            agent_id: Agent namespace to search in
            query: Search query
            top_k: Number of results to return

        Returns:
            List of matching documents with scores
        """
        try:
            if top_k is None:
                top_k = settings.VECTOR_TOP_K

            # Generate embedding for query
            query_embedding = await self.embeddings.aembed_query(query)

            # Search in Qdrant - without filter for now (index issue)
            # Note: agent_id filter requires creating an index first
            # For now, search all and filter in code
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=top_k * 3,  # Get more results to filter
                with_payload=True,
                with_vectors=False
            )

            # Filter results by agent_id in code
            filtered_results = [r for r in results if r.payload.get("agent_id") == agent_id][:top_k]
            results = filtered_results if filtered_results else []

            # Extract and format results
            documents = []
            for result in results:
                # Only include if above similarity threshold
                if result.score >= settings.VECTOR_SIMILARITY_THRESHOLD:
                    documents.append({
                        "id": result.id,
                        "score": result.score,
                        "text": result.payload.get("text", ""),
                        "metadata": result.payload
                    })

            return documents

        except Exception as e:
            print(f"Error searching vector store: {str(e)}")
            return []

    async def delete_agent_documents(self, agent_id: str):
        """Delete all documents for an agent"""
        try:
            # Delete all points with matching agent_id
            self.client.delete(
                collection_name=self.collection_name,
                points_selector={
                    "filter": {
                        "must": [
                            {
                                "key": "agent_id",
                                "match": {
                                    "value": agent_id
                                }
                            }
                        ]
                    }
                }
            )
            print(f"✅ Deleted all documents for agent {agent_id}")

        except Exception as e:
            print(f"Error deleting agent documents: {str(e)}")
            raise

    async def get_agent_stats(self, agent_id: str) -> Dict[str, any]:
        """Get statistics for an agent's knowledge base"""
        try:
            # Count points for this agent
            result = self.client.count(
                collection_name=self.collection_name,
                count_filter={
                    "must": [
                        {
                            "key": "agent_id",
                            "match": {
                                "value": agent_id
                            }
                        }
                    ]
                }
            )

            return {
                "total_vectors": result.count,
                "agent_id": agent_id
            }

        except Exception as e:
            print(f"Error getting agent stats: {str(e)}")
            return {"total_vectors": 0, "agent_id": agent_id}


# Singleton instance
_vector_store: Optional[VectorStoreService] = None


def get_vector_store() -> VectorStoreService:
    """Get vector store service instance (singleton)"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
    return _vector_store
