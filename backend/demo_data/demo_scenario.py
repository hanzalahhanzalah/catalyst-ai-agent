"""
Demo data: 5-source inventory shortage scenario.
This creates pre-built mock data for judges to see instantly.
"""
import json

WAREHOUSE_CSV = """SKU,Product,Stock_Units,Reorder_Point,Last_Updated,Warehouse_Location
SKU-001,Industrial Pump A,1200,800,2026-05-15,Karachi-W1
SKU-002,Pressure Valve B,350,400,2026-05-15,Karachi-W1
SKU-003,Pipe Fitting C,2100,1000,2026-05-15,Lahore-W2
SKU-004,Motor Drive D,180,300,2026-05-15,Karachi-W1
SKU-005,Control Panel E,95,150,2026-05-15,Islamabad-W3
Notes,Stock levels appear stable as of last audit,,,,
Status,SUFFICIENT - No immediate action required,,,,
"""

SUPPLIER_EMAIL_TEXT = """
FROM: procurement@supplier-chain.pk
TO: ops@company.pk
DATE: 2026-05-18 09:15:00
SUBJECT: URGENT - Shipment Delay Notice for Q2 Orders

Dear Procurement Team,

This is to formally notify you of a critical delay affecting your pending orders:

Order #PK-2026-8821: Industrial Pump A (500 units) — DELAYED 7 days
Order #PK-2026-8822: Pressure Valve B (600 units) — DELAYED 5 days  
Order #PK-2026-8823: Motor Drive D (200 units) — DELAYED 10 days

Reason: National Highway Authority road blockade on N-55 Motorway affecting 
        all ground transport from Karachi Port to inland warehouses.

New estimated delivery dates:
- Industrial Pump A: 2026-05-25 (was 2026-05-18)
- Pressure Valve B: 2026-05-23 (was 2026-05-18)
- Motor Drive D: 2026-05-28 (was 2026-05-18)

We apologize for the inconvenience. Please plan accordingly.

Regards,
Ali Hassan
Supply Chain Manager
Pakistan Industrial Suppliers Ltd.
"""

SALES_DASHBOARD = {
    "report_type": "sales_velocity_dashboard",
    "generated_at": "2026-05-18T14:30:00Z",
    "period": "last_7_days",
    "data": [
        {
            "sku": "SKU-001",
            "product": "Industrial Pump A",
            "daily_sales": [45, 52, 61, 78, 89, 102, 118],
            "avg_daily_sale": 77.9,
            "velocity_trend": "SURGING_+162%",
            "projected_stockout_days": 2.1,
            "current_stock": 164,
            "note": "Sales doubled in 3 days - major project demand"
        },
        {
            "sku": "SKU-002",
            "product": "Pressure Valve B",
            "daily_sales": [28, 30, 35, 41, 48, 55, 62],
            "avg_daily_sale": 42.7,
            "velocity_trend": "RISING_+121%",
            "projected_stockout_days": 1.8,
            "current_stock": 77,
            "note": "Correlated with Pump A demand"
        },
        {
            "sku": "SKU-004",
            "product": "Motor Drive D",
            "daily_sales": [12, 15, 18, 22, 28, 35, 41],
            "avg_daily_sale": 24.4,
            "velocity_trend": "RISING_+242%",
            "projected_stockout_days": 0.9,
            "current_stock": 22,
            "note": "CRITICAL: Less than 1 day stock remaining at current pace"
        }
    ],
    "alert": "CRITICAL_STOCKOUT_IMMINENT",
    "affected_skus": ["SKU-001", "SKU-002", "SKU-004"]
}

COMPLAINTS_FEED = {
    "feed_type": "customer_complaints_realtime",
    "timestamp": "2026-05-18T16:45:00Z",
    "source": "CRM System - Live Feed",
    "complaints": [
        {
            "id": "CMP-4421",
            "time": "2026-05-18T14:22:00Z",
            "product": "Industrial Pump A",
            "sku": "SKU-001",
            "complaint": "Order placed 3 days ago, no dispatch confirmation. Need urgent delivery for construction site.",
            "severity": "HIGH",
            "customer_tier": "ENTERPRISE"
        },
        {
            "id": "CMP-4422",
            "time": "2026-05-18T15:01:00Z",
            "product": "Motor Drive D",
            "sku": "SKU-004",
            "complaint": "Was told item is in stock but now getting 'unavailable' error on portal. Very frustrated.",
            "severity": "HIGH",
            "customer_tier": "PREMIUM"
        },
        {
            "id": "CMP-4423",
            "time": "2026-05-18T15:45:00Z",
            "product": "Pressure Valve B",
            "sku": "SKU-002",
            "complaint": "Expected delivery today. No update on shipment status. This is unacceptable.",
            "severity": "MEDIUM",
            "customer_tier": "STANDARD"
        },
        {
            "id": "CMP-4424",
            "time": "2026-05-18T16:20:00Z",
            "product": "Industrial Pump A",
            "sku": "SKU-001",
            "complaint": "Second complaint — still no response from support. Escalating to management.",
            "severity": "CRITICAL",
            "customer_tier": "ENTERPRISE"
        },
        {
            "id": "CMP-4425",
            "time": "2026-05-18T16:44:00Z",
            "product": "Motor Drive D",
            "sku": "SKU-004",
            "complaint": "Stock shows available on website but order failed at checkout. System error?",
            "severity": "HIGH",
            "customer_tier": "PREMIUM"
        }
    ],
    "summary": {
        "total_complaints_today": 5,
        "vs_daily_average": "+400%",
        "top_affected_sku": "SKU-001",
        "sentiment_score": -0.82,
        "escalation_risk": "VERY_HIGH"
    }
}

NEWS_ARTICLE = {
    "url": "https://mock-news.pk/transport-delays-n55",
    "title": "N-55 Motorway Blockade Causes Supply Chain Disruptions Across Pakistan",
    "published": "2026-05-18T07:00:00Z",
    "source": "Pakistan Business Review",
    "credibility": 0.85,
    "content": """
    Karachi, May 18 — A major road blockade on the N-55 Motorway, triggered by 
    ongoing infrastructure maintenance and protest activity near Hyderabad, is 
    causing widespread disruptions to supply chains across Pakistan's industrial sector.
    
    Multiple logistics companies have confirmed delays ranging from 5 to 12 days for 
    ground shipments originating from Karachi Port. The blockade, which began on 
    May 16th, is expected to continue until at least May 22nd.
    
    Industries heavily affected include construction, manufacturing, and electronics,
    particularly those relying on imported industrial components arriving through 
    Karachi Port. Analysts warn that companies without buffer stock will face 
    critical shortages within 48-72 hours.
    
    "Any company that is running lean inventory right now is in serious trouble," 
    said supply chain analyst Zara Ahmed. "The businesses that will survive this 
    are the ones that act immediately — emergency air freight or secondary suppliers."
    
    The Pakistan Industrial Association has urged the government to establish 
    alternative transport corridors. Meanwhile, air freight rates from Dubai and 
    Singapore have surged 340% as companies scramble for alternatives.
    """
}


def get_demo_sources():
    """Return all 5 demo sources as a list of dicts."""
    return [
        {
            "id": "src-warehouse-csv",
            "type": "csv",
            "name": "Warehouse Stock Audit (May 15)",
            "content": WAREHOUSE_CSV,
            "metadata": {
                "rows": 6,
                "columns": ["SKU", "Product", "Stock_Units", "Reorder_Point", "Last_Updated"],
                "data_date": "2026-05-15",
                "is_stale": True,
                "stale_reason": "3 days old — sales velocity has changed dramatically"
            },
            "credibility_score": 0.65,
            "recency_score": 0.3,
            "timestamp": "2026-05-15T00:00:00Z"
        },
        {
            "id": "src-supplier-email",
            "type": "pdf",
            "name": "Supplier Delay Notice (Email PDF)",
            "content": SUPPLIER_EMAIL_TEXT,
            "metadata": {
                "sender": "procurement@supplier-chain.pk",
                "date": "2026-05-18",
                "subject": "URGENT - Shipment Delay Notice"
            },
            "credibility_score": 0.9,
            "recency_score": 0.95,
            "timestamp": "2026-05-18T09:15:00Z"
        },
        {
            "id": "src-sales-dashboard",
            "type": "json",
            "name": "Sales Velocity Dashboard (Live)",
            "content": json.dumps(SALES_DASHBOARD, indent=2),
            "metadata": {
                "report_type": "sales_velocity",
                "period": "last_7_days",
                "alert": "CRITICAL_STOCKOUT_IMMINENT"
            },
            "credibility_score": 0.95,
            "recency_score": 1.0,
            "timestamp": "2026-05-18T14:30:00Z"
        },
        {
            "id": "src-complaints-feed",
            "type": "feed",
            "name": "Customer Complaints Feed (Real-Time)",
            "content": json.dumps(COMPLAINTS_FEED, indent=2),
            "metadata": {
                "feed_source": "CRM Live",
                "complaint_count": 5,
                "sentiment": -0.82
            },
            "credibility_score": 0.88,
            "recency_score": 1.0,
            "timestamp": "2026-05-18T16:45:00Z"
        },
        {
            "id": "src-news-article",
            "type": "web",
            "name": "N-55 Transport Disruption News",
            "content": NEWS_ARTICLE["content"],
            "metadata": {
                "url": NEWS_ARTICLE["url"],
                "title": NEWS_ARTICLE["title"],
                "published": NEWS_ARTICLE["published"],
                "source": NEWS_ARTICLE["source"]
            },
            "credibility_score": 0.85,
            "recency_score": 0.98,
            "timestamp": "2026-05-18T07:00:00Z"
        }
    ]
