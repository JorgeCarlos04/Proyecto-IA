from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Modelos para Tanques de Agua
class WaterTankBase(BaseModel):
    floor: int
    room: int
    room_number: Optional[str] = None
    current_level: float
    capacity_liters: float

class WaterTankCreate(WaterTankBase):
    pass

class WaterTankUpdate(BaseModel):
    current_level: Optional[float] = None
    capacity_liters: Optional[float] = None

class WaterTank(WaterTankBase):
    id: str
    last_updated: Optional[str] = None

    class Config:
        from_attributes = True

# Modelos para Camiones Cisterna
class WaterTruckBase(BaseModel):
    truck_number: str
    arrival_date: str
    estimated_arrival: Optional[str] = None
    water_delivered_liters: float
    status: str  # 'scheduled', 'arrived', 'delivered'
    notes: Optional[str] = None

class WaterTruckCreate(WaterTruckBase):
    pass

class WaterTruckUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class WaterTruck(WaterTruckBase):
    id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# Modelos para Alertas
class WaterAlertBase(BaseModel):
    alert_type: str  # 'critical', 'low', 'normal'
    message: str
    tank_id: Optional[str] = None

class WaterAlertCreate(WaterAlertBase):
    pass

class WaterAlertUpdate(BaseModel):
    is_resolved: Optional[bool] = None

class WaterAlert(WaterAlertBase):
    id: str
    created_at: Optional[str] = None
    is_resolved: bool = False

    class Config:
        from_attributes = True

# Modelos para Consumo (ML)
class WaterConsumptionBase(BaseModel):
    consumption_date: str
    liters_consumed: float
    tank_id: Optional[str] = None

class WaterConsumptionCreate(WaterConsumptionBase):
    pass

class WaterConsumption(WaterConsumptionBase):
    id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# Modelos para Respuestas de API
class DashboardStats(BaseModel):
    total_tanks: int
    average_level: float
    critical_tanks: int
    next_truck: Optional[str] = None

class PredictionResult(BaseModel):
    prediction_date: str
    predicted_level: float
    confidence: float
    alert_level: str  # 'normal', 'warning', 'critical'

# Modelo para actualización de nivel de tanque
class TankLevelUpdate(BaseModel):
    new_level: float

# Modelo para actualización de estado de camión
class TruckStatusUpdate(BaseModel):
    status: str