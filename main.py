from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn
import os
from pathlib import Path
from database import init_db, generate_sample_data
from routers import tanks, trucks, alerts, analytics, explainability

# Configuración de la aplicación
APP_CONFIG = {
    "title": "AquaMonitor",
    "description": "Sistema de Gestión Hídrica con IA", 
    "version": "1.0.0",
    "host": "0.0.0.0",
    "port": 8000,
    "reload": True
}

# Rutas estáticas conocidas (que existen como archivos físicos)
STATIC_ROUTES = {
    'assets',
    'favicon.ico', 
    'logo',
    'manifest.json',
    'robots.txt'
}

# Crear aplicación FastAPI
app = FastAPI(
    title=APP_CONFIG["title"],
    description=APP_CONFIG["description"],
    version=APP_CONFIG["version"]
)

# Servir archivos estáticos del frontend
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers de API
app.include_router(tanks.router, prefix="/api", tags=["Tanques"])
app.include_router(trucks.router, prefix="/api", tags=["Camiones"])
app.include_router(alerts.router, prefix="/api", tags=["Alertas"])
app.include_router(analytics.router, prefix="/api", tags=["Analíticas"])
app.include_router(explainability.router, prefix="/api", tags=["Explicabilidad"])

def is_static_route(path: str) -> bool:
    """Verificar si la ruta corresponde a un archivo estático"""
    return any(path.startswith(static_route) for static_route in STATIC_ROUTES)

def get_static_file_path(path: str) -> Path:
    """Obtener la ruta completa del archivo estático"""
    return Path("static") / path

@app.on_event("startup")
async def startup_event():
    """Inicializar base de datos y módulos de IA"""
    init_db()
    generate_sample_data()
    print("✅ Sistema AquaMonitor inicializado - Frontend + Backend integrados")
    print("✅ Módulos: Base de datos, Modelo ML, Explicabilidad (XAI)")

@app.get("/")
async def serve_frontend():
    """Servir la aplicación frontend principal"""
    index_path = Path("static/index.html")
    
    if not index_path.exists():
        raise HTTPException(
            status_code=500, 
            detail="Frontend no encontrado. Ejecuta 'npm run build' en el frontend."
        )
    
    return FileResponse(index_path)

@app.get("/{full_path:path}")
async def serve_frontend_routes(full_path: str):
    """
    Manejar todas las rutas del frontend para React Router
    """
    # Interceptar rutas de API
    if full_path.startswith('api/'):
        raise HTTPException(status_code=404, detail="Endpoint no encontrado")
    
    # Servir archivos estáticos si existen
    if is_static_route(full_path):
        static_file_path = get_static_file_path(full_path)
        if static_file_path.exists():
            return FileResponse(static_file_path)
    
    # Para todas las rutas de React, servir index.html
    return FileResponse("static/index.html")

@app.get("/health")
async def health_check():
    """Endpoint de salud del sistema"""
    return {
        "status": "healthy", 
        "service": "aquamonitor-fullstack",
        "version": APP_CONFIG["version"],
        "modules": {
            "database": "active",
            "ml_model": "active", 
            "xai": "active",
            "api_endpoints": "active"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=APP_CONFIG["host"],
        port=APP_CONFIG["port"],
        reload=APP_CONFIG["reload"]
    )