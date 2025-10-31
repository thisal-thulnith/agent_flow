"""
Run database migrations on Supabase
"""
import sys
from pathlib import Path
from database.supabase_client import db

def run_migration(migration_file: str):
    """Run a SQL migration file"""
    migration_path = Path(__file__).parent / "migrations" / migration_file

    if not migration_path.exists():
        print(f"❌ Migration file not found: {migration_path}")
        return False

    print(f"📄 Reading migration: {migration_file}")
    with open(migration_path, 'r') as f:
        sql_content = f.read()

    print("🔄 Executing migration...")
    try:
        # Execute the SQL using Supabase's RPC or raw SQL
        # Note: Supabase Python client doesn't support raw SQL execution
        # We'll need to use PostgREST rpc or direct PostgreSQL connection
        print("⚠️  Note: This migration needs to be run in Supabase SQL Editor")
        print("\n" + "="*70)
        print("Please follow these steps:")
        print("="*70)
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project")
        print("3. Navigate to 'SQL Editor' in the left sidebar")
        print("4. Click 'New query'")
        print("5. Copy and paste the SQL below:")
        print("="*70 + "\n")
        print(sql_content)
        print("\n" + "="*70)
        print("6. Click 'Run' to execute the migration")
        print("="*70 + "\n")
        return True
    except Exception as e:
        print(f"❌ Error executing migration: {str(e)}")
        return False

if __name__ == "__main__":
    migration_file = "create_orders_table.sql"
    if len(sys.argv) > 1:
        migration_file = sys.argv[1]

    success = run_migration(migration_file)
    sys.exit(0 if success else 1)
