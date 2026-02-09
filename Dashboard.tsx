
// pages/Dashboard.tsx - VERSIÓN COMPLETA CON ML
import { useEffect, useState } from "react";
import { useWaterStore } from "@/stores/waterStore";
import { useAdminStore } from "@/stores/adminStore";
import DashboardStats from "@/components/DashboardStats";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line 
} from "recharts";
import { 
  RefreshCw, Shield, Eye, Zap, AlertTriangle, 
  Droplets, Truck, Clock, Building, Activity,
  Brain, TrendingUp, AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { 
    tanks, 
    cistern, 
    trucks, 
    alerts, 
    isLoading, 
    error,
    fetchAllData,
    getActiveAlerts,
    getCriticalTanks,
    fetchTrucks,
    fetchAlerts,
    
    // 🔮 NUEVO: Funciones ML
    mlPredictions,
    modelInfo,
    isTraining,
    predictionError,
    fetchMLPredictions,
    trainMLModel,
    getMLModelInfo,
    getLatestPrediction,
    getConsumptionTrend
  } = useWaterStore();
  
  const { isAdmin, toggleAdmin } = useAdminStore();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Configurar refresco automático cada 30 segundos
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadDashboardData();
      }, 30000); // 30 segundos
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      await fetchAllData();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error al cargar datos del dashboard');
    }
  };

  // ✅ Calculos seguros
  const averageLevel = tanks.length > 0
    ? tanks.reduce((sum, tank) => sum + (tank.current_level || 0), 0) / tanks.length
    : 0;

  const criticalTanks = getCriticalTanks();
  const activeAlerts = getActiveAlerts();
  const openValves = tanks.filter(t => t.valve_status === 'open').length;
  
  // 🔮 Datos ML
  const latestPrediction = getLatestPrediction();
  const consumptionTrend = getConsumptionTrend();
  
  // Próximo camión
  const nextTruck = trucks.find(t => t.status === 'scheduled');
  const nextTruckDate = nextTruck 
    ? new Date(nextTruck.estimated_arrival || nextTruck.arrival_date).toLocaleDateString('es-ES', { 
        weekday: 'short',
        day: '2-digit', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : undefined;

  // ✅ Datos para gráficas
  const chartData = tanks
    .filter(tank => tank.floor !== null)
    .map(tank => {
      const level = tank.current_level || 0;
      return {
        floor: `P${tank.floor}`,
        nivel: parseFloat(level.toFixed(1)),
        status: level < 25 ? 'critical' : level < 50 ? 'warning' : 'normal',
        capacity: tank.capacity_liters || 3000
      };
    })
    .sort((a, b) => {
      const floorA = parseInt(a.floor.replace('P', ''));
      const floorB = parseInt(b.floor.replace('P', ''));
      return floorA - floorB;
    });

  // Consumo simulado (últimos 7 días) ahora con predicciones ML
  const consumptionData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const baseConsumption = 400;
    const variation = Math.sin(i * 0.8) * 80;
    const consumo = Math.max(200, Math.floor(baseConsumption + variation + Math.random() * 60 - 30));
    
    // 🔮 Si hay predicciones ML, usarlas para valores futuros
    const prediccionML = latestPrediction ? latestPrediction.predicted_consumption : 
                        Math.max(150, consumo + Math.random() * 100 - 50);
    
    return {
      dia: date.toLocaleDateString('es-ES', { weekday: 'short' }),
      consumo,
      prediccion: i >= 5 ? prediccionML : consumo // Últimos 2 días son predicciones
    };
  });

  const handleRefresh = async () => {
    await loadDashboardData();
    toast.success("🔄 Datos actualizados", {
      description: `Última actualización: ${new Date().toLocaleTimeString('es-ES')}`
    });
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast.info(
      autoRefresh ? "⏸️ Auto-refresh desactivado" : "🔄 Auto-refresh activado (30s)",
      { duration: 2000 }
    );
  };

  const handleSimulateIoT = async () => {
    if (!isAdmin) {
      toast.error("🔒 Requiere modo administrador", {
        description: "Cambie a modo admin para simular"
      });
      return;
    }
    
    try {
      toast.info("📡 Simulando sensores IoT...", {
        description: "Actualizando niveles automáticamente"
      });
      
      // Simular delay de IoT
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Forzar recarga de datos
      await Promise.all([fetchAllData(), fetchTrucks(), fetchAlerts()]);
      
      toast.success("✅ Simulación completada", {
        description: "Datos actualizados desde sensores virtuales"
      });
    } catch (error) {
      console.error('Error simulating IoT:', error);
      toast.error('❌ Error en simulación IoT');
    }
  };

  // 🔮 NUEVO: Entrenar modelo ML
  const handleTrainMLModel = async () => {
    if (!isAdmin) {
      toast.error("🔒 Requiere modo administrador", {
        description: "Solo administradores pueden entrenar modelos"
      });
      return;
    }
    
    try {
      toast.info("🧠 Entrenando modelo de IA...", {
        description: "Esto puede tomar unos segundos"
      });
      
      const result = await trainMLModel();
      
      if (result?.success) {
        toast.success("✅ Modelo entrenado exitosamente", {
          description: "IA lista para nuevas predicciones"
        });
      }
    } catch (error) {
      console.error('Error training ML model:', error);
      toast.error('❌ Error entrenando modelo');
    }
  };

  // 🔮 NUEVO: Obtener nueva predicción ML
  const handleGetMLPrediction = async () => {
    try {
      await fetchMLPredictions();
      toast.success("🔮 Nueva predicción generada", {
        description: "IA ha analizado los datos actuales"
      });
    } catch (error) {
      console.error('Error getting ML prediction:', error);
    }
  };

  const handleToggleAdmin = () => {
    toggleAdmin();
    toast.info(
      isAdmin ? "👁️ Cambiando a modo consulta" : "🛡️ Cambiando a modo administrador",
      { 
        description: isAdmin 
          ? "Solo podrá visualizar datos" 
          : "Ahora puede realizar modificaciones",
        duration: 3000
      }
    );
  };

  // Colores para gráficas
  const getBarColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#10b981';
    }
  };

  if (error) {
    toast.error(`❌ Error: ${error}`);
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Building className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-water bg-clip-text text-transparent">
              Dashboard IMS2
            </h1>
          </div>
          <p className="text-muted-foreground">
            Sistema de monitoreo hídrico con IA predictiva
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* TOGGLE ADMIN */}
          <Button
            onClick={handleToggleAdmin}
            variant={isAdmin ? "default" : "outline"}
            className="gap-2"
            size="sm"
          >
            {isAdmin ? (
              <>
                <Shield className="h-4 w-4" />
                Modo Admin
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Modo Consulta
              </>
            )}
          </Button>
          
          {/* 🔮 BOTÓN ENTRENAR ML */}
          {isAdmin && (
            <Button
              onClick={handleTrainMLModel}
              variant="secondary"
              size="sm"
              disabled={isTraining}
              className="gap-2"
            >
              <Brain className={`h-4 w-4 ${isTraining ? 'animate-pulse' : ''}`} />
              {isTraining ? 'Entrenando...' : 'Entrenar IA'}
            </Button>
          )}
          
          {/* CONTROLES */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAutoRefresh}
              className="gap-2"
              title={autoRefresh ? "Auto-refresh activado (30s)" : "Auto-refresh desactivado"}
            >
              <Clock className={`h-4 w-4 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} />
              {autoRefresh ? '30s' : 'Off'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </Button>
            
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSimulateIoT}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Simular IoT
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* INFO BAR MEJORADA CON ML */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700">
                <span className="font-semibold">{tanks.length}</span> tanques activos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-600" />
              <span className="text-cyan-700">
                Nivel: <span className="font-semibold">{averageLevel.toFixed(1)}%</span>
              </span>
            </div>
            
            {/* 🔮 INFO ML */}
            {latestPrediction && (
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="text-purple-700">
                  Predicción: <span className="font-semibold">
                    {latestPrediction.predicted_consumption.toFixed(0)}L
                  </span>
                </span>
              </div>
            )}
            
            {criticalTanks.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-red-700">
                  <span className="font-semibold">{criticalTanks.length}</span> crítico(s)
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-3 w-3" />
            <span className="text-xs">
              Última actualización: {lastUpdate.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
              {autoRefresh && ' (auto)'}
            </span>
          </div>
        </div>
      </div>

      {/* CISTERNA PRINCIPAL */}
      {cistern ? (
        <Card className="p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-xl">
                <Droplets className="h-8 w-8 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-cyan-800">🏭 Cisterna Principal</h2>
                <p className="text-cyan-600">Fuente principal de abastecimiento</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-800">{(cistern.current_level || 0).toFixed(1)}%</p>
                <p className="text-xs text-cyan-600">Nivel actual</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-cyan-800">
                  {Math.round((cistern.current_level || 0) * cistern.capacity_liters / 100).toLocaleString()}L
                </p>
                <p className="text-xs text-cyan-600">Disponible</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-cyan-800">72,000L</p>
                <p className="text-xs text-cyan-600">Capacidad total</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className={
                  cistern.valve_status === 'open' 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : 'bg-gray-100 text-gray-700'
                }>
                  {cistern.valve_status === 'open' ? '✅ Abierta' : '🔒 Cerrada'}
                </Badge>
                <p className="text-xs text-cyan-600 mt-1">Válvula</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="relative">
              <Progress 
                value={cistern.current_level || 0} 
                className="h-3"
              />
              <div 
                className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${cistern.current_level || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-cyan-600 mt-2">
              <span>0%</span>
              <span>Nivel actual</span>
              <span>100%</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <Skeleton className="h-24 w-full" />
        </Card>
      )}

      {/* ESTADÍSTICAS PRINCIPALES */}
      <DashboardStats
        totalTanks={tanks.length}
        averageLevel={averageLevel}
        criticalTanks={criticalTanks.length}
        nextTruck={nextTruckDate}
        cisternLevel={cistern?.current_level}
        activeAlerts={activeAlerts.length}
        totalCapacity={72000 + (tanks.length * 3000)}
        openValves={openValves}
        lastUpdate={lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      />

      {/* GRÁFICAS Y ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICA DE NIVELES POR PISO */}
        <Card className="p-6 bg-gradient-to-b from-white to-gray-50 border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">📊 Niveles por Piso</h2>
              <p className="text-sm text-gray-600">11 tanques de distribución</p>
            </div>
            <Badge variant="outline" className="bg-white">
              {tanks.length} activos
            </Badge>
          </div>
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="floor" 
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280' }}
                  label={{ 
                    value: 'Nivel (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    fill: '#6b7280'
                  }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Nivel']}
                  labelFormatter={(label) => `🏢 Piso ${label.replace('P', '')}`}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="nivel" 
                  name="Nivel Actual (%)" 
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Cargando datos de tanques...</p>
            </div>
          )}
          
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm">Normal (≥50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded"></div>
              <span className="text-sm">Bajo (25-49%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-sm">Crítico ({'<'}25%)</span>
            </div>
          </div>
        </Card>

        {/* ALERTAS Y CONSUMO CON IA */}
        <div className="space-y-6">
          {/* ALERTAS ACTIVAS */}
          <Card className="p-6 bg-gradient-to-b from-white to-gray-50 border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  activeAlerts.length > 0 
                    ? 'bg-gradient-to-r from-red-100 to-orange-100' 
                    : 'bg-gradient-to-r from-green-100 to-emerald-100'
                }`}>
                  <AlertTriangle className={`h-6 w-6 ${
                    activeAlerts.length > 0 ? 'text-red-600' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    ⚡ Alertas Activas
                  </h2>
                  <p className="text-sm text-gray-600">
                    Sistema de monitoreo automático
                  </p>
                </div>
              </div>
              <Badge variant={activeAlerts.length > 0 ? 'destructive' : 'outline'}>
                {activeAlerts.length} {activeAlerts.length === 1 ? 'alerta' : 'alertas'}
              </Badge>
            </div>
            
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="text-gray-600 font-medium">¡Todo en orden!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    No hay alertas activas en el sistema
                  </p>
                </div>
              ) : (
                activeAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.alert_type === 'critical' 
                        ? 'bg-gradient-to-r from-red-50/70 to-white border-red-200' 
                        : 'bg-gradient-to-r from-amber-50/70 to-white border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            alert.alert_type === 'critical' ? 'destructive' : 'outline'
                          } className="text-xs">
                            {alert.alert_type === 'critical' ? '🚨 CRÍTICO' : '⚠️ BAJO'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(alert.created_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <p className="font-medium text-gray-800 text-sm">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {activeAlerts.length > 4 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-500">
                    +{activeAlerts.length - 4} alerta(s) más...
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* CONSUMO SEMANAL CON PREDICCIÓN IA */}
          <Card className="p-6 bg-gradient-to-b from-white to-gray-50 border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">📈 Consumo Semanal</h2>
              {latestPrediction && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                  IA: {latestPrediction.predicted_consumption.toFixed(0)}L
                </Badge>
              )}
            </div>
            
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={consumptionData}>
                <defs>
                  <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorPrediccion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(270 95% 75%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(270 95% 75%)" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="dia" 
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    const label = name === 'consumo' ? 'Consumo Real' : 'Predicción IA';
                    return [`${value} L`, label];
                  }}
                  labelFormatter={(label) => `Día: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="consumo" 
                  name="consumo"
                  stroke="hsl(221 83% 53%)" 
                  strokeWidth={2}
                  fill="url(#colorConsumo)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="prediccion" 
                  name="prediccion"
                  stroke="hsl(270 95% 75%)" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#colorPrediccion)" 
                />
              </AreaChart>
            </ResponsiveContainer>
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Consumo Real</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>Predicción IA</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Promedio: {
                  Math.round(consumptionData.reduce((sum, day) => sum + day.consumo, 0) / consumptionData.length)
                }L/día
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* MODO CONSULTA BADGE */}
      {!isAdmin && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 animate-pulse border border-amber-300">
          <Eye className="h-5 w-5" />
          <div>
            <p className="font-semibold">👁️ Modo Consulta</p>
            <p className="text-xs opacity-90">Solo visualización - Cambie a modo admin para editar</p>
          </div>
        </div>
      )}

      {/* AUTO-REFRESH INDICATOR */}
      {autoRefresh && !isLoading && (
        <div className="fixed bottom-6 left-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Auto-refresh (30s)
        </div>
      )}
    </div>
  );
};

export default Dashboard;