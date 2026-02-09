from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn
import os
from pathlib import Path
from database import init_db, generate_sample_data
from routers import tanks, trucks, alerts, analytics, explainability, iot, admin, ml_model

# Configuración de la aplicación
APP_CONFIG = {
    "title": "AquaMonitor",
    "description": "Sistema de Gestión Hídrica con IA", 
    "version": "1.0.0",
    "host": "0.0.0.0",
    "port": 8000,
    "reload": True
}

# CARPETA DEL FRONTEND - VERIFICA QUÉ CARPETA TIENES
FRONTEND_DIRS = ["static", "dist", "build", "public"]
frontend_dir = None

for dir_name in FRONTEND_DIRS:
    if os.path.exists(dir_name) and os.path.exists(os.path.join(dir_name, "index.html")):
        frontend_dir = dir_name
        print(f"✅ Frontend encontrado en carpeta: {frontend_dir}")
        break

if not frontend_dir:
    print("⚠️ No se encontró carpeta frontend. Creando estructura básica...")
    frontend_dir = "static"
    os.makedirs(frontend_dir, exist_ok=True)
    os.makedirs(os.path.join(frontend_dir, "assets"), exist_ok=True)
    
    # Crear index.html básico
    with open(os.path.join(frontend_dir, "index.html"), "w") as f:
        f.write('''<!DOCTYPE html>
<html>
<head>
    <title>AquaMonitor - Universidad de Oriente</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
        h1 { color: #0d6efd; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <h1>🚰 AquaMonitor Backend</h1>
    <p>Backend funcionando correctamente</p>
    <div>
        <div class="endpoint"><a href="/api/trucks">/api/trucks</a> - Camiones</div>
        <div class="endpoint"><a href="/api/tanks">/api/tanks</a> - Tanques</div>
        <div class="endpoint"><a href="/api/alerts">/api/alerts</a> - Alertas</div>
        <div class="endpoint"><a href="/docs">/docs</a> - API Docs</div>
        <div class="endpoint"><a href="/health">/health</a> - Salud</div>
    </div>
    <p style="margin-top: 30px; color: #666;">
        Si tienes el frontend construido, colócalo en la carpeta: static/, dist/, build/ o public/
    </p>
</body>
</html>''')

# Crear aplicación FastAPI
app = FastAPI(
    title=APP_CONFIG["title"],
    description=APP_CONFIG["description"],
    version=APP_CONFIG["version"]
)

# Configurar CORS - IMPORTANTE para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En desarrollo permite todo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== SERVIR ARCHIVOS ESTÁTICOS ==========
if os.path.exists(os.path.join(frontend_dir, "assets")):
    app.mount("/assets", StaticFiles(directory=f"{frontend_dir}/assets"), name="assets")
    print(f"✅ Assets montados desde: {frontend_dir}/assets")

# ========== INCLUIR ROUTERS DE API ==========
# El orden es importante: primero los endpoints específicos
try:
    app.include_router(tanks.router, prefix="/api", tags=["Tanques"])
    #app.include_router(trucks.router, prefix="/api", tags=["Camiones"])
    app.include_router(alerts.router, prefix="/api", tags=["Alertas"])
    app.include_router(analytics.router, prefix="/api", tags=["Analíticas"])
    #app.include_router(explainability.router, prefix="/api", tags=["Explicabilidad"])
    app.include_router(iot.router, prefix="/api", tags=["IoT"])
    app.include_router(admin.router, prefix="/api", tags=["Administración"])
    app.include_router(ml_model.router, prefix="/api", tags=["Modelo ML"])
    print("✅ Todos los routers cargados")
except Exception as e:
    print(f"⚠️ Error cargando routers: {e}")

# ========== INICIALIZACIÓN ==========
@app.on_event("startup")
async def startup_event():
    """Inicializar base de datos y módulos de IA"""
    try:
        init_db()
        generate_sample_data()
        print("✅ Sistema AquaMonitor inicializado")
        print(f"✅ Frontend: {frontend_dir}")
        print("✅ Módulos: Base de datos, Modelo ML, Explicabilidad (XAI)")
    except Exception as e:
        print(f"⚠️ Error en inicialización: {e}")

# ========== ENDPOINTS ==========
@app.get("/health")
async def health_check():
    """Endpoint de salud del sistema"""
    return {
        "status": "healthy", 
        "service": "aquamonitor-fullstack",
        "version": APP_CONFIG["version"],
        "frontend_dir": frontend_dir,
        "frontend_exists": os.path.exists(os.path.join(frontend_dir, "index.html")),
        "api_endpoints": [
            "/api/trucks",
            "/api/tanks", 
            "/api/alerts",
            "/api/analytics",
            "/docs"
        ]
    }

@app.get("/api/status")
async def api_status():
    """Estado detallado de la API"""
    return {
        "api": "running",
        "database": "connected",
        "ml_model": "loaded",
        "endpoints_available": [
            {"method": "GET", "path": "/api/trucks", "desc": "Lista de camiones"},
            {"method": "GET", "path": "/api/tanks", "desc": "Estado de tanques"},
            {"method": "GET", "path": "/api/alerts", "desc": "Alertas del sistema"},
            {"method": "GET", "path": "/api/analytics", "desc": "Analíticas y predicciones"},
            {"method": "GET", "path": "/health", "desc": "Salud del sistema"},
            {"method": "GET", "path": "/docs", "desc": "Documentación Swagger"}
        ]
    }

# ========== MANEJO DE RUTAS SPA ==========
@app.get("/")
async def serve_frontend():
    """Servir la aplicación frontend principal"""
    index_path = Path(f"{frontend_dir}/index.html")
    
    if not index_path.exists():
        # Si no hay frontend, mostrar página básica
        return {
            "message": "AquaMonitor Backend funcionando",
            "instructions": "Frontend no encontrado. Construye el frontend y colócalo en static/, dist/ o build/",
            "api_endpoints": {
                "health": "/health",
                "trucks": "/api/trucks", 
                "tanks": "/api/tanks",
                "docs": "/docs"
            }
        }
    
    return FileResponse(index_path)

@app.get("/{full_path:path}")
async def serve_frontend_routes(full_path: str):
    """
    Manejar todas las rutas del frontend para React/Vue Router
    """
    # Si es una ruta de API, dejar que FastAPI la maneje
    if full_path.startswith('api/'):
        # Esta línea nunca debería ejecutarse si las rutas API están bien definidas
        raise HTTPException(status_code=404, detail=f"API endpoint no encontrado: {full_path}")
    
    # Si es un archivo estático que existe, servirlo
    static_file = Path(f"{frontend_dir}/{full_path}")
    if static_file.exists() and static_file.is_file():
        return FileResponse(static_file)
    
    # Si no es un archivo, verificar si es una ruta de assets
    if "/assets/" in full_path or full_path.endswith(('.js', '.css', '.png', '.jpg', '.ico', '.svg')):
        # Buscar el archivo en la carpeta correcta
        possible_paths = [
            Path(f"{frontend_dir}/{full_path}"),
            Path(f"static/{full_path}"),
            Path(f"dist/{full_path}")
        ]
        
        for path in possible_paths:
            if path.exists():
                return FileResponse(path)
        
        raise HTTPException(status_code=404, detail=f"Archivo estático no encontrado: {full_path}")
    
    # Para cualquier otra ruta (SPA routing), servir index.html
    index_path = Path(f"{frontend_dir}/index.html")
    if index_path.exists():
        return FileResponse(index_path)
    
    # Si no hay index.html, mostrar error
    raise HTTPException(
        status_code=404,
        detail="Frontend no disponible. Verifica que el frontend esté construido."
    )

# ========== EJECUCIÓN ==========
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 AQUAMONITOR - UNIVERSIDAD DE ORIENTE")
    print("="*60)
    print(f"📂 Directorio frontend: {frontend_dir}")
    print(f"🌐 URL: http://localhost:{APP_CONFIG['port']}")
    print(f"📚 Docs: http://localhost:{APP_CONFIG['port']}/docs")
    print(f"❤️  Health: http://localhost:{APP_CONFIG['port']}/health")
    print(f"🚚 API Trucks: http://localhost:{APP_CONFIG['port']}/api/trucks")
    print("="*60 + "\n")
    
    
    uvicorn.run(
        "main:app",  # ← AQUÍ: Pasar como string "main:app"
        host=APP_CONFIG["host"],
        port=APP_CONFIG["port"],
        reload=APP_CONFIG["reload"]
    )