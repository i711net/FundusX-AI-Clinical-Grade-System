import os
from typing import Any


def save_ai_report(result: dict[str, Any]) -> str | None:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
      return None

    from supabase import create_client

    client = create_client(url, key)
    payload = {
        "image_url": result.get("image_path"),
        "diagnosis": result.get("diagnosis"),
        "confidence": result.get("confidence"),
        "lesions": result.get("lesions"),
        "heatmap_url": result.get("heatmap_path"),
        "detection_url": result.get("detection_path"),
        "risk_level": result.get("risk_level"),
        "recommendation": result.get("recommendation"),
    }
    response = client.table("ai_reports").insert(payload).execute()
    data = response.data or []
    if data:
        return data[0].get("id")
    return None
