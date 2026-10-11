"""Ponto de entrada FastAPI — Simulador HCM ↔ Guaxene."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.routes import router

app = FastAPI(
    title="Simulador de Comunicação Resiliente HCM ↔ Guaxene",
    description="Simulador académico — Comunicação Móvel, Licenciatura em Engenharia Informática",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    # localhost e 127.0.0.1 são origens diferentes para o browser
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Comprime respostas grandes (a linha temporal de 120 h passa de ~156 KB para uma fracção)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {
        "simulador": "HCM ↔ Guaxene",
        "versao": "1.0.0",
        "docs": "/docs",
        "endpoints": ["/api/config", "/api/scenarios", "/api/scenarios/{id}/run", "/api/simulation/run", "/api/simulation/timeline"],
    }
