"""
HyMupen Backend Server
======================
Self-contained FastAPI server yang bisa jalan tanpa database/Docker.

Mode operasi:
  - DEMO mode  : data in-memory, tidak butuh TimescaleDB/Redis/MQTT
  - PRODUCTION : koneksi ke TimescaleDB + MQTT + Redis via .env

Jalankan:
  pip install fastapi uvicorn
  python server.py

Akses:
  API  : http://localhost:8000
  Docs : http://localhost:8000/docs
"""

import asyncio
import json
import math
import os
import random
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ═══════════════════════════════════════════════
# IN-MEMORY STATE (Demo mode)
# ═══════════════════════════════════════════════

# Sensor state — diupdate oleh simulator setiap 5 detik
SENSOR_STATE: Dict[str, Dict] = {
    "A1": {
        "id": "A1",
        "crop": "Jagung",
        "vwc": 38.0,
        "temp": 34.2,
        "batt": 91,
        "thr": 35,
        "dose": 80,
        "loc": "Blok Utara",
        "node": "ESP-001",
        "status": "warn",
    },
    "A2": {
        "id": "A2",
        "crop": "Kedelai",
        "vwc": 52.3,
        "temp": 32.1,
        "batt": 78,
        "thr": 42,
        "dose": 85,
        "loc": "Blok Utara",
        "node": "ESP-002",
        "status": "ok",
    },
    "B1": {
        "id": "B1",
        "crop": "Cabai",
        "vwc": 28.1,
        "temp": 33.8,
        "batt": 65,
        "thr": 38,
        "dose": 120,
        "loc": "Blok Selatan",
        "node": "LoRa-001",
        "status": "crit",
    },
    "B2": {
        "id": "B2",
        "crop": "Tomat",
        "vwc": 61.0,
        "temp": 31.5,
        "batt": 34,
        "thr": 40,
        "dose": 70,
        "loc": "Blok Selatan",
        "node": "LoRa-002",
        "status": "ok",
    },
}

# Sensor history (last 48 readings per field per metric)
HISTORY: Dict[str, List] = {k: [] for k in SENSOR_STATE}

# Irrigation logs
IRR_LOGS: List[Dict] = []

# Hydrogel stock (grams)
HYDROGEL_STOCK = {"stock_g": 2400.0, "history": []}

# Connected WebSocket clients
WS_CLIENTS: Set[WebSocket] = set()

# Drift params (simulate realistic VWC decline)
DRIFTS = {"A1": -0.08, "A2": -0.03, "B1": -0.06, "B2": -0.02}


# ═══════════════════════════════════════════════
# BACKGROUND SIMULATOR
# ═══════════════════════════════════════════════


async def sensor_simulator():
    """Simulasi pembacaan sensor setiap 5 detik & broadcast ke WebSocket."""
    tick = 0
    while True:
        await asyncio.sleep(5)
        tick += 1
        ts = datetime.now(timezone.utc).isoformat()

        for fid, f in SENSOR_STATE.items():
            # Update VWC dengan drift + noise
            drift = DRIFTS.get(fid, -0.05)
            f["vwc"] = round(
                max(15.0, min(85.0, f["vwc"] + drift + (random.random() - 0.54) * 0.3)),
                2,
            )
            f["temp"] = round(f["temp"] + (random.random() - 0.5) * 0.08, 1)
            f["status"] = "crit" if f["vwc"] < 30 else "warn" if f["vwc"] < 45 else "ok"

            # Simpan ke history
            HISTORY[fid].append({"vwc": f["vwc"], "temp": f["temp"], "ts": ts})
            if len(HISTORY[fid]) > 288:  # max 24 jam (5 detik interval = 288/jam)
                HISTORY[fid].pop(0)

            # Auto-trigger emergency irrigation jika kritis
            if f["vwc"] < 25 and tick % 60 == 0:
                await do_irrigate(fid, f["dose"], "auto_emergency")

        # Broadcast ke semua WebSocket clients
        msg = json.dumps(
            {
                "type": "sensor_batch",
                "fields": {
                    fid: {"vwc": f["vwc"], "temp": f["temp"], "status": f["status"]}
                    for fid, f in SENSOR_STATE.items()
                },
                "ts": ts,
                "tick": tick,
            }
        )
        dead = set()
        for ws in WS_CLIENTS.copy():
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        WS_CLIENTS -= dead

        # Alert broadcast jika ada kondisi kritis baru
        crits = [fid for fid, f in SENSOR_STATE.items() if f["vwc"] < 30]
        if crits and tick % 12 == 0:
            alert = json.dumps(
                {
                    "type": "alert",
                    "level": "critical",
                    "fields": crits,
                    "msg": f"VWC kritis di petak {', '.join(crits)}",
                    "ts": ts,
                }
            )
            for ws in WS_CLIENTS.copy():
                try:
                    await ws.send_text(alert)
                except Exception:
                    pass


async def do_irrigate(field_id: str, dose_g: int, trigger: str = "manual"):
    """Catat irigasi + kurangi stok."""
    HYDROGEL_STOCK["stock_g"] = max(0.0, HYDROGEL_STOCK["stock_g"] - dose_g)
    HYDROGEL_STOCK["history"].append(
        {
            "ts": datetime.now(timezone.utc).isoformat(),
            "field_id": field_id,
            "delta_g": -dose_g,
            "stock_g": HYDROGEL_STOCK["stock_g"],
        }
    )
    IRR_LOGS.append(
        {
            "id": len(IRR_LOGS) + 1,
            "field_id": field_id,
            "triggered_by": trigger,
            "dose_g": dose_g,
            "vwc_before": SENSOR_STATE[field_id]["vwc"],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "success": True,
        }
    )
    # Naikan VWC sedikit setelah irigasi
    await asyncio.sleep(0.1)
    SENSOR_STATE[field_id]["vwc"] = min(
        85.0, SENSOR_STATE[field_id]["vwc"] + dose_g * 0.06
    )


# ═══════════════════════════════════════════════
# APP LIFESPAN
# ═══════════════════════════════════════════════


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("╔═════════════════════════════════════════╗")
    print("║  HyMupen Backend  —  Demo Mode          ║")
    print("║  API  : http://localhost:8000           ║")
    print("║  Docs : http://localhost:8000/docs      ║")
    print("║  App  : http://localhost:8000/app       ║")
    print("╚═════════════════════════════════════════╝")
    task = asyncio.create_task(sensor_simulator())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# ═══════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════

app = FastAPI(
    title="HyMupen API",
    version="5.0.0",
    description="Smart irrigation API — HyMupen platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)


# ── Serve frontend di /app
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
FRONTEND_DIR = os.path.abspath(FRONTEND_DIR)
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/app", response_class=HTMLResponse, include_in_schema=False)
@app.get("/app/{path:path}", response_class=HTMLResponse, include_in_schema=False)
async def serve_frontend(path: str = ""):
    idx = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(idx):
        return FileResponse(idx)
    return HTMLResponse(
        "<h3>Frontend not found — letakkan index.html di folder frontend/</h3>", 404
    )


# ═══════════════════════════════════════════════
# API ROUTES
# ═══════════════════════════════════════════════


# ── Health
@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "mode": "demo",
        "version": "5.0.0",
        "uptime": round(time.monotonic()),
        "clients": len(WS_CLIENTS),
    }


# ── Fields
class FieldUpdate(BaseModel):
    threshold: Optional[float] = None
    dose_g: Optional[int] = None


@app.get("/api/v1/fields", tags=["Fields"])
async def list_fields():
    return list(SENSOR_STATE.values())


@app.get("/api/v1/fields/{field_id}", tags=["Fields"])
async def get_field(field_id: str):
    if field_id not in SENSOR_STATE:
        raise HTTPException(404, f"Field '{field_id}' not found")
    return SENSOR_STATE[field_id]


@app.get("/api/v1/fields/{field_id}/latest", tags=["Fields"])
async def get_field_latest(field_id: str):
    if field_id not in SENSOR_STATE:
        raise HTTPException(404, f"Field '{field_id}' not found")
    f = SENSOR_STATE[field_id]
    return {
        "field_id": field_id,
        "readings": {
            "vwc": {"value": f["vwc"], "ts": datetime.now(timezone.utc).isoformat()},
            "temp": {"value": f["temp"], "ts": datetime.now(timezone.utc).isoformat()},
            "batt": {"value": f["batt"], "ts": datetime.now(timezone.utc).isoformat()},
        },
        "status": f["status"],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@app.patch("/api/v1/fields/{field_id}", tags=["Fields"])
async def update_field(field_id: str, data: FieldUpdate):
    if field_id not in SENSOR_STATE:
        raise HTTPException(404, "Field not found")
    if data.threshold is not None:
        SENSOR_STATE[field_id]["thr"] = data.threshold
    if data.dose_g is not None:
        SENSOR_STATE[field_id]["dose"] = data.dose_g
    return SENSOR_STATE[field_id]


# ── Sensors snapshot + history
@app.get("/api/v1/sensors/snapshot", tags=["Sensors"])
async def sensors_snapshot():
    return {
        "snapshot": {
            fid: {"vwc": f["vwc"], "temp": f["temp"], "status": f["status"]}
            for fid, f in SENSOR_STATE.items()
        },
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/sensors/{field_id}/history", tags=["Sensors"])
async def sensor_history(
    field_id: str,
    metric: str = Query("vwc"),
    points: int = Query(48, ge=1, le=288),
):
    if field_id not in HISTORY:
        raise HTTPException(404, "Field not found")
    hist = HISTORY[field_id][-points:]
    return {
        "field_id": field_id,
        "metric": metric,
        "data": [{"ts": h["ts"], "value": h.get(metric, 0)} for h in hist],
    }


# ── Irrigation
class IrrigateCmd(BaseModel):
    field_id: str
    dose_g: int = 80
    triggered_by: str = "manual"


@app.post("/api/v1/irrigation/trigger", tags=["Irrigation"])
async def trigger_irrigation(cmd: IrrigateCmd):
    if cmd.field_id not in SENSOR_STATE:
        raise HTTPException(404, "Field not found")
    if HYDROGEL_STOCK["stock_g"] < cmd.dose_g:
        raise HTTPException(
            400, f"Stok hidrogel tidak cukup ({HYDROGEL_STOCK['stock_g']}g tersisa)"
        )
    await do_irrigate(cmd.field_id, cmd.dose_g, cmd.triggered_by)
    # Broadcast ke WebSocket
    msg = json.dumps(
        {
            "type": "irrigation_done",
            "field_id": cmd.field_id,
            "dose_g": cmd.dose_g,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
    )
    for ws in WS_CLIENTS.copy():
        try:
            await ws.send_text(msg)
        except Exception:
            pass
    return {
        "ok": True,
        "field_id": cmd.field_id,
        "dose_g": cmd.dose_g,
        "stock_remaining_g": HYDROGEL_STOCK["stock_g"],
    }


@app.get("/api/v1/irrigation/logs", tags=["Irrigation"])
async def irrigation_logs(limit: int = Query(20, ge=1, le=100)):
    return list(reversed(IRR_LOGS))[:limit]


# ── Hydrogel
class RefillCmd(BaseModel):
    amount_g: float
    notes: Optional[str] = None


@app.get("/api/v1/hydrogel/stock", tags=["Hydrogel"])
async def get_stock():
    sg = HYDROGEL_STOCK["stock_g"]
    return {
        "stock_g": sg,
        "stock_kg": round(sg / 1000, 3),
        "days_remaining": round(sg / 133),
        "status": "critical" if sg < 500 else "low" if sg < 1500 else "ok",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/v1/hydrogel/refill", tags=["Hydrogel"])
async def refill_stock(cmd: RefillCmd):
    HYDROGEL_STOCK["stock_g"] = min(5000.0, HYDROGEL_STOCK["stock_g"] + cmd.amount_g)
    HYDROGEL_STOCK["history"].append(
        {
            "ts": datetime.now(timezone.utc).isoformat(),
            "delta_g": cmd.amount_g,
            "stock_g": HYDROGEL_STOCK["stock_g"],
            "reason": "refill",
        }
    )
    return {"ok": True, "stock_g": HYDROGEL_STOCK["stock_g"], "added_g": cmd.amount_g}


# ── Predictions
@app.get("/api/v1/predictions/{field_id}/drought", tags=["Predictions"])
async def drought_prediction(field_id: str, horizon: int = Query(7, ge=1, le=14)):
    if field_id not in SENSOR_STATE:
        raise HTTPException(404, "Field not found")

    current = SENSOR_STATE[field_id]["vwc"]
    hist = HISTORY.get(field_id, [])

    # Simple linear regression on recent history
    vwcs = [h["vwc"] for h in hist[-72:]] if hist else [current]
    n = len(vwcs)
    if n >= 2:
        slope = (vwcs[-1] - vwcs[0]) / n  # per reading (5 sec interval)
        daily_slope = slope * (86400 / 5)  # scale to per day
    else:
        daily_slope = -0.8  # default decline

    forecast = []
    for d in range(horizon):
        pred = current + daily_slope * (d + 1) * math.exp(-d * 0.12)
        forecast.append(round(max(15.0, min(85.0, pred)), 1))

    min_pred = min(forecast)
    risk = "high" if min_pred < 33 else "medium" if min_pred < 42 else "low"

    return {
        "field_id": field_id,
        "horizon_days": horizon,
        "vwc_forecast": forecast,
        "risk_level": risk,
        "min_predicted": min_pred,
        "predicted_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/predictions/{field_id}/threshold", tags=["Predictions"])
async def adaptive_threshold(field_id: str):
    if field_id not in SENSOR_STATE:
        raise HTTPException(404, "Field not found")
    f = SENSOR_STATE[field_id]
    # Adaptive: base + temp correction
    base = f["thr"]
    temp_correction = max(0, (f["temp"] - 30) * 0.3)
    adaptive = round(base + temp_correction, 1)
    return {
        "field_id": field_id,
        "threshold": adaptive,
        "base": base,
        "correction": round(temp_correction, 1),
        "reason": f"Suhu {f['temp']}°C menaikkan kebutuhan air",
    }


# ── WebSocket
@app.websocket("/ws/sensor-stream")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    WS_CLIENTS.add(ws)
    try:
        # Kirim snapshot awal
        await ws.send_text(
            json.dumps(
                {
                    "type": "init",
                    "fields": SENSOR_STATE,
                    "stock": HYDROGEL_STOCK["stock_g"],
                }
            )
        )
        while True:
            # Keep-alive — terima pesan dari client (filter, commands, dll)
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=30)
                data = json.loads(msg)
                if data.get("type") == "ping":
                    await ws.send_text(
                        json.dumps(
                            {
                                "type": "pong",
                                "ts": datetime.now(timezone.utc).isoformat(),
                            }
                        )
                    )
                elif data.get("type") == "irrigate":
                    fid = data.get("field_id")
                    dose = data.get("dose_g", 80)
                    if fid in SENSOR_STATE:
                        await do_irrigate(fid, dose, "ws_manual")
                        await ws.send_text(
                            json.dumps(
                                {"type": "irrigate_ok", "field_id": fid, "dose_g": dose}
                            )
                        )
            except asyncio.TimeoutError:
                # Send keepalive
                await ws.send_text(
                    json.dumps(
                        {
                            "type": "heartbeat",
                            "ts": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                )
    except WebSocketDisconnect:
        pass
    finally:
        WS_CLIENTS.discard(ws)


# ═══════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        workers=1,
        log_level="info",
    )
