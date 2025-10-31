"""
Supabase client and database connection management
"""

from supabase import create_client, Client
from typing import Optional
import asyncio
from config import settings

# Singleton Supabase client
_supabase_client: Optional[Client] = None


def init_supabase() -> Client:
    """
    Initialize Supabase client (singleton pattern)
    """
    global _supabase_client

    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )

    return _supabase_client


def get_supabase() -> Client:
    """
    Get Supabase client instance
    Creates client if not already initialized
    """
    if _supabase_client is None:
        return init_supabase()
    return _supabase_client


def get_admin_supabase() -> Client:
    """
    Get Supabase client with service role key (admin privileges)
    Use for server-side operations that need elevated permissions
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )


async def test_connection() -> bool:
    """
    Test Supabase connection
    Returns True if connection is successful
    """
    try:
        client = get_supabase()
        # Try to query a table (will work even if empty)
        result = client.table("agents").select("id").limit(1).execute()
        return True
    except Exception as e:
        print(f"Supabase connection test failed: {str(e)}")
        return False


# Database helper functions
class DatabaseHelper:
    """Helper class for common database operations"""

    @staticmethod
    def get_client(admin: bool = False) -> Client:
        """Get Supabase client (admin or regular)"""
        return get_admin_supabase() if admin else get_supabase()

    @staticmethod
    async def execute_query(table: str, operation: str, **kwargs):
        """
        Execute a database query with error handling

        Args:
            table: Table name
            operation: 'select', 'insert', 'update', 'delete'
            **kwargs: Operation-specific arguments
        """
        try:
            client = get_supabase()
            table_ref = client.table(table)

            if operation == "select":
                query = table_ref.select(kwargs.get("columns", "*"))
                if "filters" in kwargs:
                    for key, value in kwargs["filters"].items():
                        query = query.eq(key, value)
                if "limit" in kwargs:
                    query = query.limit(kwargs["limit"])
                if "order" in kwargs:
                    query = query.order(kwargs["order"], desc=kwargs.get("desc", False))

                result = query.execute()
                return {"success": True, "data": result.data}

            elif operation == "insert":
                result = table_ref.insert(kwargs.get("data", {})).execute()
                return {"success": True, "data": result.data}

            elif operation == "update":
                query = table_ref.update(kwargs.get("data", {}))
                if "filters" in kwargs:
                    for key, value in kwargs["filters"].items():
                        query = query.eq(key, value)
                result = query.execute()
                return {"success": True, "data": result.data}

            elif operation == "delete":
                query = table_ref.delete()
                if "filters" in kwargs:
                    for key, value in kwargs["filters"].items():
                        query = query.eq(key, value)
                result = query.execute()
                return {"success": True, "data": result.data}

            else:
                return {"success": False, "error": f"Unknown operation: {operation}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_by_id(table: str, record_id: str):
        """Get a single record by ID"""
        return await DatabaseHelper.execute_query(
            table,
            "select",
            filters={"id": record_id}
        )

    @staticmethod
    async def get_by_user(table: str, user_id: str, limit: int = 100):
        """Get all records for a specific user"""
        return await DatabaseHelper.execute_query(
            table,
            "select",
            filters={"user_id": user_id},
            limit=limit,
            order="created_at",
            desc=True
        )

    @staticmethod
    async def create_record(table: str, data: dict):
        """Create a new record"""
        return await DatabaseHelper.execute_query(
            table,
            "insert",
            data=data
        )

    @staticmethod
    async def update_record(table: str, record_id: str, data: dict):
        """Update an existing record"""
        return await DatabaseHelper.execute_query(
            table,
            "update",
            filters={"id": record_id},
            data=data
        )

    @staticmethod
    async def delete_record(table: str, record_id: str):
        """Delete a record"""
        return await DatabaseHelper.execute_query(
            table,
            "delete",
            filters={"id": record_id}
        )


# Export helper instance
db = DatabaseHelper()
