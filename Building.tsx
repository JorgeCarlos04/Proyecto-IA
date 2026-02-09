// Building.tsx - VERSIÓN COMPLETA CORREGIDA CON REDIRECCIÓN
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWaterStore } from "@/stores/waterStore";
import { useAdminStore } from "@/stores/adminStore";
import { WaterLevelCard } from "@/components/WaterLevelCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Droplets, Eye, Building as BuildingIcon, Gauge, AlertCircle, Zap, Wrench, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const Building = () => {
  const [searchParams] = useSearchParams();
  const focusTankId = searchParams.get('focus');
  const action = searchParams.get('action');
  const requestId = searchParams.get('request');
  
  const { 
    tanks, 
    cistern,
    fillRequests,
    fetchTanks, 
    fetchFillRequests,
    updateTankLevel,
    approveFillRequest,
    getCriticalTanks,
    fetchAllData
  } = useWaterStore();
  
  const { isAdmin } = useAdminStore();
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedTank, setSelectedTank] = useState<any>(null);
  const [newLevel, setNewLevel] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [buildingStats, setBuildingStats] = useState({
    totalTanks: 0,
    criticalTanks: 0,
    totalCapacity: 0,
    averageLevel: 0,
    openValves: 0
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    updateBuildingStats();
  }, [tanks, cistern]);

  useEffect(() => {
    // Si hay parámetros de foco, seleccionar automáticamente
    if (focusTankId && action === 'fill') {
      const tankId = focusTankId.replace('tank_', '');
      const tank = tanks.find(t => t.id === tankId);
      
      if (tank) {
        // Seleccionar el piso
        setSelectedFloor(tank.floor || 1);
        
        // Mostrar notificación
        toast.info("🔧 Acción de llenado solicitada", {
          description: (
            <div className="space-y-2">
              <p>Tanque Piso {tank.floor} seleccionado para llenado</p>
              {requestId && (
                <Button 
                  size="sm" 
                  onClick={() => handleApproveFillRequest(requestId)}
                  className="mt-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  ✅ Aprobar Llenado Ahora
                </Button>
              )}
            </div>
          ),
          duration: 5000
        });
        
        // Scroll a la tarjeta del tanque después de un momento
        setTimeout(() => {
          const element = document.getElementById(`tank-${tankId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-blue-500', 'animate-pulse');
            
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-blue-500', 'animate-pulse');
            }, 3000);
          }
        }, 1000);
      }
    }
  }, [focusTankId, action, requestId, tanks]);

  const fetchInitialData = async () => {
    try {
      await fetchAllData();
    } catch (error) {
      console.error('Error fetching building data:', error);
      toast.error('Error al cargar datos del edificio');
    }
  };

  const updateBuildingStats = () => {
    const criticalTanks = getCriticalTanks();
    const totalCapacity = tanks.reduce((sum, tank) => sum + (tank.capacity_liters || 3000), 0);
    const averageLevel = tanks.length > 0 
      ? tanks.reduce((sum, tank) => sum + (tank.current_level || 0), 0) / tanks.length 
      : 0;
    const openValves = tanks.filter(t => t.valve_status === 'open').length;

    setBuildingStats({
      totalTanks: tanks.length,
      criticalTanks: criticalTanks.length,
      totalCapacity: totalCapacity + (cistern?.capacity_liters || 0),
      averageLevel,
      openValves
    });
  };

  const handleTankClick = (tank: any) => {
    if (!isAdmin) {
      toast.info("👁️ Modo consulta: Solo visualización", {
        description: "Cambie a modo administrador para editar"
      });
      return;
    }
    
    setSelectedTank(tank);
    setNewLevel((tank.current_level || 0).toString());
    setIsDialogOpen(true);
  };

  const handleUpdateLevel = async () => {
    if (!selectedTank || !newLevel) return;

    const level = parseFloat(newLevel);
    if (isNaN(level) || level < 0 || level > 100) {
      toast.error('❌ El nivel debe estar entre 0 y 100%');
      return;
    }

    if (Math.abs(level - (selectedTank.current_level || 0)) > 50) {
      toast.warning('⚠️ Cambio muy grande', {
        description: "¿Está seguro de cambiar más del 50%?"
      });
      return;
    }

    try {
      await updateTankLevel(selectedTank.id, level);
      toast.success('✅ Nivel actualizado correctamente', {
        description: `Piso ${selectedTank.floor}: ${(selectedTank.current_level || 0).toFixed(1)}% → ${level.toFixed(1)}%`
      });
      setIsDialogOpen(false);
      setNewLevel("");
    } catch (error: any) {
      console.error('Error updating tank:', error);
      toast.error('❌ Error al actualizar el nivel', {
        description: error.message || 'Intente nuevamente'
      });
    }
  };

  const handleApproveFillRequest = async (requestId: string) => {
    if (!isAdmin) {
      toast.error("🔒 Requiere modo administrador");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await approveFillRequest(requestId);
      if (result?.success) {
        toast.success('✅ Solicitud aprobada correctamente', {
          description: "La válvula se abrirá automáticamente y comenzará el llenado"
        });
        
        // Si hay un tanque en foco, actualizarlo
        if (focusTankId) {
          setTimeout(() => {
            fetchInitialData();
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error('❌ Error al aprobar solicitud', {
        description: error.message || 'Intente nuevamente'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const floorTanks = tanks.filter(tank => tank.floor === selectedFloor);
  const pendingRequests = fillRequests.filter(r => r.status === 'pending');
  const criticalTanks = getCriticalTanks();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BuildingIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-water bg-clip-text text-transparent">
              Edificio IMS2
            </h1>
          </div>
          <p className="text-muted-foreground">
            Sistema de distribución de agua - 11 pisos + Cisterna Principal
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInitialData}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Actualizar
          </Button>
          
          {criticalTanks.length > 0 && (
            <Badge variant="destructive" className="gap-2 animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              {criticalTanks.length} Crítico(s)
            </Badge>
          )}
        </div>
      </div>

      {/* BUILDING STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Tanques</p>
              <p className="text-2xl font-bold text-blue-700">{buildingStats.totalTanks}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <Gauge className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-blue-500 mt-2">11 pisos activos</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 font-medium">Nivel Promedio</p>
              <p className="text-2xl font-bold text-amber-700">{buildingStats.averageLevel.toFixed(1)}%</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-full">
              <Droplets className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <Progress value={buildingStats.averageLevel} className="mt-2 h-1" />
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-white border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Críticos</p>
              <p className="text-2xl font-bold text-red-700">{buildingStats.criticalTanks}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-red-500 mt-2">&lt; 25% nivel</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Válvulas Abiertas</p>
              <p className="text-2xl font-bold text-green-700">{buildingStats.openValves}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-500 mt-2">Llenado activo</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Capacidad Total</p>
              <p className="text-2xl font-bold text-purple-700">
                {(buildingStats.totalCapacity / 1000).toFixed(1)}kL
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <BuildingIcon className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-purple-500 mt-2">72kL cisterna + 33kL tanques</p>
        </Card>
      </div>

      {/* NOTIFICACIÓN DE REDIRECCIÓN SI HAY */}
      {focusTankId && action === 'fill' && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800">🔧 Acción de Llenado Solicitada</h3>
                <p className="text-sm text-blue-600">
                  Un tanque fue seleccionado para llenado desde las Alertas
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.history.replaceState({}, '', window.location.pathname)}
              className="border-blue-300 text-blue-700"
            >
              ✕ Cerrar
            </Button>
          </div>
        </Card>
      )}

      {/* CISTERNA PRINCIPAL */}
      {cistern && (
        <Card className="p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg">
                <Droplets className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-cyan-800">🏭 Cisterna Principal</h2>
                <p className="text-sm text-cyan-600">Reserva de agua para todo el edificio</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              {cistern.valve_status === 'open' ? '✅ Abierta' : '🔒 Cerrada'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Nivel Actual</span>
                <span className="font-semibold text-cyan-700">{(cistern.current_level || 0).toFixed(1)}%</span>
              </div>
              <Progress value={cistern.current_level || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Agua Disponible</span>
                <span className="font-semibold text-cyan-700">
                  {Math.round((cistern.current_level || 0) * cistern.capacity_liters / 100).toLocaleString()}L
                </span>
              </div>
              <div className="text-xs text-gray-500">
                de {cistern.capacity_liters.toLocaleString()}L totales
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Última Actualización</span>
                <span className="text-sm text-gray-600">
                  {new Date(cistern.last_updated).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Suministra agua a todos los pisos
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SOLICITUDES PENDIENTES */}
      {isAdmin && pendingRequests.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-amber-800">
                  ⚡ Solicitudes de Llenado Pendientes
                </h2>
                <p className="text-sm text-amber-600">
                  {pendingRequests.length} tanque(s) requieren llenado urgente
                </p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
              {pendingRequests.length} Pendiente(s)
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRequests.map((request) => {
              const tank = tanks.find(t => t.id === request.tank_id);
              if (!tank) return null;
              
              return (
                <Card key={request.id} className="p-4 bg-white border border-amber-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">🏢 Piso {tank.floor}</p>
                      <p className="text-sm text-gray-600">
                        Nivel: {(tank.current_level || 0).toFixed(1)}%
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">
                      ⏳ Esperando
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Nivel solicitado:</span>
                      <span className="font-semibold">{request.requested_level || 100}%</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Solicitado: {new Date(request.requested_at).toLocaleString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleApproveFillRequest(request.id)}
                    disabled={isProcessing}
                    className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    size="sm"
                  >
                    <Droplets className="h-4 w-4" />
                    {isProcessing ? 'Procesando...' : 'Aprobar Llenado'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* PISOS */}
      <Card className="p-6 bg-gradient-to-b from-white to-gray-50 border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">🏗️ Distribución por Pisos</h2>
            <p className="text-gray-600">Seleccione un piso para ver detalles</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Normal
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
              Bajo
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Crítico
            </Badge>
          </div>
        </div>

        <Tabs value={selectedFloor.toString()} onValueChange={(val) => setSelectedFloor(parseInt(val))}>
          <TabsList className="grid grid-cols-6 md:grid-cols-11 gap-2 h-auto">
            {Array.from({ length: 11 }, (_, i) => i + 1).map((floor) => {
              const floorTank = tanks.find(t => t.floor === floor);
              const level = floorTank?.current_level || 0;
              const isCritical = level < 25;
              const isLow = level >= 25 && level < 50;
              
              return (
                <TabsTrigger 
                  key={floor} 
                  value={floor.toString()} 
                  className={`flex-col h-auto py-3 gap-1 ${
                    isCritical ? 'bg-red-50 data-[state=active]:bg-red-100 border-red-200' :
                    isLow ? 'bg-amber-50 data-[state=active]:bg-amber-100 border-amber-200' :
                    'bg-green-50 data-[state=active]:bg-green-100 border-green-200'
                  }`}
                >
                  <span className="font-semibold">Piso {floor}</span>
                  <span className={`text-xs ${
                    isCritical ? 'text-red-600' :
                    isLow ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {level.toFixed(0)}%
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Array.from({ length: 11 }, (_, i) => i + 1).map((floor) => (
            <TabsContent key={floor} value={floor.toString()} className="mt-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">🏢 Piso {floor}</h3>
                    <p className="text-gray-600">Tanque de distribución del piso</p>
                  </div>
                  {!isAdmin && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      👁️ Solo visualización
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {floorTanks.map((tank) => {
                    const isCritical = (tank.current_level || 0) < 25;
                    const isLow = (tank.current_level || 0) >= 25 && (tank.current_level || 0) < 50;
                    
                    return (
                      <WaterLevelCard
                        key={tank.id}
                        id={`tank-${tank.id}`} // IMPORTANTE: ID para redirección
                        roomNumber={`Piso ${tank.floor}`}
                        level={tank.current_level || 0}
                        capacity={tank.capacity_liters || 3000}
                        onClick={() => handleTankClick(tank)}
                        disabled={!isAdmin}
                        valveStatus={tank.valve_status}
                        showValveStatus={true}
                        status={isCritical ? 'critical' : isLow ? 'warning' : 'normal'}
                        className={isCritical ? 'border-red-300 bg-red-50/30' : 
                                 isLow ? 'border-amber-300 bg-amber-50/30' : 
                                 'border-green-300 bg-green-50/30'}
                      />
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* DIALOG DE ACTUALIZACIÓN */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Actualizar Nivel del Tanque
            </DialogTitle>
            <DialogDescription>
              {selectedTank && `Piso ${selectedTank.floor} | Capacidad: ${(selectedTank.capacity_liters || 3000).toLocaleString()}L`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* NIVEL ACTUAL */}
            <div className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-700">Nivel Actual</Label>
                <span className="text-xs text-gray-500">Actualizado: {
                  selectedTank?.last_updated 
                    ? new Date(selectedTank.last_updated).toLocaleTimeString('es-ES')
                    : 'N/A'
                }</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {(selectedTank?.current_level || 0).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    {Math.round(((selectedTank?.current_level || 0) * (selectedTank?.capacity_liters || 3000) / 100)).toLocaleString()}L disponibles
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Válvula</p>
                  <Badge variant={selectedTank?.valve_status === 'open' ? 'default' : 'outline'}>
                    {selectedTank?.valve_status === 'open' ? '✅ Abierta' : '🔒 Cerrada'}
                  </Badge>
                </div>
              </div>
              <Progress value={selectedTank?.current_level || 0} className="mt-3 h-2" />
            </div>
            
            {/* ACTUALIZACIÓN */}
            {isAdmin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-level" className="text-gray-700">
                    Nuevo Nivel (%)
                    <span className="text-xs text-gray-500 ml-2">0 - 100</span>
                  </Label>
                  <Input
                    id="new-level"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    placeholder="Ej: 85.5"
                    className="text-lg"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setNewLevel("25")}
                    size="sm"
                  >
                    Establecer 25%
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setNewLevel("50")}
                    size="sm"
                  >
                    Establecer 50%
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setNewLevel("75")}
                    size="sm"
                  >
                    Establecer 75%
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setNewLevel("100")}
                    size="sm"
                  >
                    Establecer 100%
                  </Button>
                </div>
                
                <Button 
                  onClick={handleUpdateLevel} 
                  className="w-full gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700"
                  size="lg"
                >
                  <Zap className="h-4 w-4" />
                  Actualizar Nivel
                </Button>
              </>
            ) : (
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <Eye className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                <h4 className="font-semibold text-blue-800 mb-2">Modo Consulta Activado</h4>
                <p className="text-blue-600 mb-3">
                  Solo puede visualizar información. Cambie a modo administrador para realizar modificaciones.
                </p>
                <Button variant="outline" className="gap-2 border-blue-300 text-blue-700">
                  🔒 Sin permisos de edición
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Building;