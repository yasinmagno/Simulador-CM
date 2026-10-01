"""Ponto de entrada FastAPI — Simulador HCM ↔ Guaxene."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(
    title="Simulador de Comunicação Resiliente HCM ↔ Guaxene",
    description="Simulador académico — Comunicação Móvel, Licenciatura em Engenharia Informática",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {
        "simulador": "HCM ↔ Guaxene",
        "versao": "1.0.0",
        "docs": "/docs",
        "estado": "Fase 3 — Backend e lógica de resiliência",
    }
