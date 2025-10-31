"""
Test script to create a sample order
Run this after the database migration is complete
"""
import asyncio
import sys
from datetime import datetime
from database.supabase_client import db

async def create_test_order():
    """Create a test order in the database"""

    print("🔍 Fetching first agent...")

    # Get the first agent
    client = db.get_client()
    agents = client.table('agents').select('id, user_id, name').limit(1).execute()

    if not agents.data or len(agents.data) == 0:
        print("❌ No agents found. Please create an agent first.")
        return False

    agent = agents.data[0]
    print(f"✅ Found agent: {agent['name']} (ID: {agent['id']})")

    # Generate order number
    from random import randint
    order_number = f"ORD-{datetime.now().year}-{str(randint(1, 999999)).zfill(6)}"

    print(f"\n📦 Creating test order: {order_number}")

    # Create test order
    order_data = {
        'order_number': order_number,
        'agent_id': agent['id'],
        'user_id': agent['user_id'],
        'customer_name': 'John Doe',
        'customer_email': 'john.doe@example.com',
        'customer_phone': '+1-555-123-4567',
        'shipping_address': {
            'street': '123 Main Street',
            'city': 'San Francisco',
            'state': 'CA',
            'zip': '94102',
            'country': 'USA'
        },
        'items': [
            {
                'name': 'Premium Sales Package',
                'quantity': 1,
                'price': 299.99
            },
            {
                'name': 'Add-on Services',
                'quantity': 2,
                'price': 49.99
            }
        ],
        'total_amount': 399.97,
        'currency': 'USD',
        'status': 'pending',
        'payment_status': 'pending',
        'payment_method': 'credit_card',
        'customer_notes': 'Please deliver during business hours',
        'status_history': [
            {
                'status': 'pending',
                'timestamp': datetime.utcnow().isoformat(),
                'note': 'Order created - Test order'
            }
        ]
    }

    try:
        result = client.table('orders').insert(order_data).execute()

        if result.data:
            order = result.data[0]
            print(f"\n✅ Order created successfully!")
            print(f"\n📋 Order Details:")
            print(f"   Order Number: {order['order_number']}")
            print(f"   Customer: {order['customer_name']}")
            print(f"   Total: ${order['total_amount']}")
            print(f"   Status: {order['status']}")
            print(f"\n🔗 Tracking URL:")
            print(f"   http://localhost:5173/track/{order['order_number']}")
            print(f"\n✅ You can now:")
            print(f"   1. View this order in the agent's Orders tab")
            print(f"   2. Track it at the URL above")
            print(f"   3. Update its status from the dashboard")
            return True
        else:
            print("❌ Failed to create order")
            return False

    except Exception as e:
        print(f"❌ Error creating order: {str(e)}")
        print(f"\n💡 This might mean the orders table hasn't been created yet.")
        print(f"   Please run the database migration first.")
        return False

if __name__ == "__main__":
    print("="*70)
    print("🧪 Test Order Creation Script")
    print("="*70)
    print()

    success = asyncio.run(create_test_order())

    if not success:
        sys.exit(1)

    print("\n" + "="*70)
    print("✅ Test completed!")
    print("="*70)
