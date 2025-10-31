# Order Tracking & Management System - Setup Guide

## Overview

A complete order tracking and management system has been implemented for your Sales AI Agent platform. This system allows customers to place orders through AI agents and track them using a public order tracking page.

## What's Been Implemented

### Backend (Complete)

1. **Orders Router** ([backend/routers/orders.py](backend/routers/orders.py))
   - Create new orders
   - List orders (with filtering by agent and status)
   - Get order details
   - Update order status
   - Public order tracking (no authentication required)
   - Order statistics

2. **Database Migration** ([backend/migrations/create_orders_table.sql](backend/migrations/create_orders_table.sql))
   - Orders table with comprehensive fields
   - Indexes for performance
   - Triggers for auto-updating timestamps
   - Function to generate unique order numbers (ORD-YYYY-NNNNNN format)
   - Status history tracking

### Frontend (Complete)

1. **Orders Tab in AgentDetail** ([frontend/src/pages/AgentDetail.jsx](frontend/src/pages/AgentDetail.jsx))
   - View all orders placed through an agent
   - Quick stats (Total Orders, Revenue, Pending, Delivered)
   - Order status management
   - Order details modal
   - Status update actions (Processing → Shipped → Delivered)

2. **Public Order Tracking Page** ([frontend/src/pages/OrderTracking.jsx](frontend/src/pages/OrderTracking.jsx))
   - Accessible at `/track` or `/track/:orderNumber`
   - No authentication required
   - Visual order progress tracker
   - Complete order details
   - Status timeline
   - Shipping information

## Setup Instructions

### Step 1: Run Database Migration

The orders table needs to be created in your Supabase database.

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to "SQL Editor" in the left sidebar
4. Click "New query"
5. Copy the entire contents of `backend/migrations/create_orders_table.sql`
6. Paste it into the SQL editor
7. Click "Run" to execute the migration

### Step 2: Verify Backend is Running

The backend should already be running with the orders router registered. You can verify by checking:

```bash
# Backend should be running at
http://localhost:8000

# API documentation is available at
http://localhost:8000/docs
```

### Step 3: Test the System

1. Navigate to your agent detail page
2. Click on the "Orders" tab
3. You should see the order management interface (empty initially)

## How to Use the Order System

### Creating Orders (Manual Testing)

Until order capture is integrated in the AI chat, you can test by creating orders via the API:

```bash
curl -X POST "http://localhost:8000/api/orders/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": null,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "shipping_address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    },
    "items": [
      {
        "name": "Sample Product",
        "quantity": 1,
        "price": 99.99
      }
    ],
    "total_amount": 99.99,
    "payment_method": "credit_card"
  }'
```

### Viewing Orders

1. **Agent Dashboard**
   - Go to agent detail page
   - Click "Orders" tab
   - View all orders placed through that agent
   - Click "View Details" for complete order information

2. **Public Order Tracking**
   - Share tracking link: `http://localhost:5173/track/ORD-2025-XXXXXX`
   - Or direct customers to: `http://localhost:5173/track`
   - Enter order number to view status

### Managing Orders

**Update Order Status:**

1. Go to agent detail → Orders tab
2. Find the order
3. Click appropriate action button:
   - "Mark as Processing" (for pending orders)
   - "Mark as Shipped" (for processing orders)
   - "Mark as Delivered" (for shipped orders)

**Status Flow:**
```
pending → processing → shipped → delivered
```

### Order Statuses

- **pending**: Order created, awaiting confirmation
- **confirmed**: Order confirmed, preparing to process
- **processing**: Order being prepared/packaged
- **packaged**: Order packaged, ready to ship
- **shipped**: Order shipped, in transit
- **delivered**: Order delivered successfully
- **cancelled**: Order cancelled

## API Endpoints

### Authenticated Endpoints (Require Authorization header)

- `POST /api/orders/` - Create new order
- `GET /api/orders/` - List orders (supports filtering)
- `GET /api/orders/{order_id}` - Get order details
- `PATCH /api/orders/{order_id}/status` - Update order status
- `GET /api/orders/stats/summary` - Get order statistics

### Public Endpoints (No authentication)

- `GET /api/orders/track/{order_number}` - Track order by order number

## Database Schema

### Orders Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| order_number | VARCHAR(20) | Unique order identifier (ORD-YYYY-NNNNNN) |
| agent_id | UUID | Reference to agent |
| conversation_id | UUID | Reference to conversation (optional) |
| user_id | UUID | Reference to user who owns the agent |
| customer_name | VARCHAR(255) | Customer name |
| customer_email | VARCHAR(255) | Customer email |
| customer_phone | VARCHAR(50) | Customer phone |
| shipping_address | JSONB | Complete shipping address |
| items | JSONB | Array of order items |
| total_amount | DECIMAL(10, 2) | Total order amount |
| currency | VARCHAR(3) | Currency code (default: USD) |
| status | VARCHAR(50) | Current order status |
| tracking_number | VARCHAR(100) | Shipping tracking number |
| carrier | VARCHAR(100) | Shipping carrier |
| estimated_delivery | DATE | Estimated delivery date |
| customer_notes | TEXT | Notes from customer |
| internal_notes | TEXT | Internal notes |
| status_history | JSONB | Array of status changes with timestamps |
| payment_status | VARCHAR(50) | Payment status |
| payment_method | VARCHAR(50) | Payment method |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| delivered_at | TIMESTAMP | Delivery timestamp |
| metadata | JSONB | Additional metadata |

## Next Steps

### Remaining Tasks

1. **Integrate Order Capture in AI Chat**
   - Modify the conversational agent to detect order intent
   - Extract order details from conversation
   - Create order automatically when customer confirms
   - Provide order number and tracking link to customer

2. **Add Payment Integration** (Optional)
   - Integrate with Stripe or other payment gateway
   - Update payment_status when payment is received
   - Send payment confirmation emails

3. **Add Email Notifications** (Optional)
   - Order confirmation email
   - Shipping notification email
   - Delivery confirmation email

4. **Add Order Management Features** (Optional)
   - Edit order details
   - Cancel orders
   - Refund management
   - Bulk status updates

## Features

### Completed Features ✅

- ✅ Create orders via API
- ✅ List and filter orders by agent and status
- ✅ View detailed order information
- ✅ Update order status with history tracking
- ✅ Public order tracking page (no auth required)
- ✅ Status timeline visualization
- ✅ Order statistics and analytics
- ✅ Unique order number generation
- ✅ Shipping address management
- ✅ Multiple items per order
- ✅ Status history with timestamps
- ✅ Responsive UI with glassmorphism design

### Pending Features ⏳

- ⏳ Automatic order capture from AI conversations
- ⏳ Payment gateway integration
- ⏳ Email notifications
- ⏳ Order editing and cancellation
- ⏳ Tracking number integration with shipping carriers

## Troubleshooting

### Backend Issues

1. **Import Errors**
   - All imports have been fixed
   - Backend should be running successfully
   - Check: `curl http://localhost:8000/health`

2. **Database Connection**
   - Verify Supabase credentials in `.env`
   - Test connection from backend startup logs

### Frontend Issues

1. **Page Not Found**
   - Routes have been added to `App.jsx`
   - Clear browser cache and reload
   - Check browser console for errors

2. **Orders Not Loading**
   - Verify SQL migration has been run
   - Check browser network tab for API errors
   - Verify authentication token is valid

## File Locations

### Backend Files
- `backend/routers/orders.py` - Orders API router
- `backend/migrations/create_orders_table.sql` - Database migration
- `backend/main.py` - Updated to include orders router
- `backend/run_migration.py` - Migration helper script

### Frontend Files
- `frontend/src/pages/OrderTracking.jsx` - Public order tracking page
- `frontend/src/pages/AgentDetail.jsx` - Updated with Orders tab
- `frontend/src/App.jsx` - Updated with tracking routes

## Support

For issues or questions:
1. Check backend logs: `tail -f logs/backend.log`
2. Check frontend console in browser DevTools
3. Verify all migrations have been run
4. Ensure both servers are running

---

**Status**: Backend and frontend implementation complete. Database migration pending user action.

**Last Updated**: 2025-10-31
