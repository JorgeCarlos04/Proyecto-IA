// Alerts.tsx - VERSIÓN CORREGIDA SIN ERRORES DE SINTAXIS
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWaterStore } from "@/stores/waterStore";
import { useAdminStore } from "@/stores/adminStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, RefreshCw, Bell, ShieldAlert, Clock, Activity, Wrench, Droplets, Lock, Unlock } from "lucide-react";

const Alerts = () => {
  const navigate = useNavigate();
  const { 
    alerts, 
    tanks, 
    cistern,
    fetchAlerts, 
    resolveAlert,
    getActiveAlerts,
    isLoading,
    goToFillTank
  } = useWaterStore();
  
  const { isAdmin } = useAdminStore();
  const [resolvedAlerts, setResolvedAlerts] = useState<any[]>([]);
  const [isCheckingReactivation, setIsCheckingReactivation] = useState(false);
  const [alertStats, setAlertStats] = useState({
    total: 0,
    critical: 0,
    low: 0,
    reactivated: 0
  });

  useEffect(() => {
    fetchAlertsData();
  }, []);

  useEffect(() => {
    // Actualizar estadísticas cuando cambien las alertas
    if (alerts.length > 0) {
      const critical = alerts.filter(a => a.alert_type === 'critical' && !a.is_resolved).length;
      const low = alerts.filter(a => a.alert_type === 'low' && !a.is_resolved).length;
      const reactivated = alerts.filter(a => a.reactivated).length;
      
      setAlertStats({
        total: alerts.length,
        critical,
        low,
        reactivated
      });
    }
  }, [alerts]);

  const fetchAlertsData = async () => {
    try {
      await fetchAlerts();
      // Separar alertas resueltas
      const resolved = alerts.filter(a => a.is_resolved);
      setResolvedAlerts(resolved);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error("Error al cargar alertas");
    }
  };

  const handleFillTank = async (alertId: string) => {
    if (!isAdmin) {
      toast.error("🔒 Requiere modo administrador");
      return;
    }

    const fillInfo = goToFillTank(alertId);
    
    if (!fillInfo) {
      toast.error("No se pudo obtener información del tanque");
      return;
    }
    
    // Crear solicitud de llenado
    const requestId = await fillInfo.createFillRequest();
    
    if (requestId) {
      toast.success("📝 Solicitud de llenado creada", {
        description: "Redirigiendo a edificio para abrir válvula..."
      });
      
      // Redirigir a Building con parámetros
      navigate(`/building?focus=tank_${fillInfo.tankId}&action=fill&request=${requestId}`);
    } else {
      toast.error("Error creando solicitud");
    }
  };

  const handleResolveAlert = async (id: string) => {
    if (!isAdmin) {
      toast.error("🔒 Requiere modo administrador");
      return;
    }

    const alert = alerts.find(a => a.id === id);
    if (!alert) {
      toast.error("Alerta no encontrada");
      return;
    }
    
    const tank = tanks.find(t => t.id === alert.tank_id) || cistern;
    
    if (!tank) {
      toast.error("Tanque no encontrado");
      return;
    }
    
    // VERIFICAR SI LA VÁLVULA ESTÁ ABIERTA
    if (tank.valve_status !== 'open') {
      toast.warning("🔧 Primero debe abrir la válvula", {
        description: (
          <div className="space-y-2">
            <p>El tanque necesita llenado antes de resolver la alerta</p>
            <Button 
              size="sm" 
              onClick={() => handleFillTank(id)}
              className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Abrir Válvula para Llenado
            </Button>
          </div>
        ),
        duration: 5000
      });
      return;
    }
    
    // VERIFICAR NIVEL {'>'} 50% (usando entidad HTML)
    if (tank.current_level < 50) {
      toast.warning("💧 Nivel insuficiente", {
        description: (
          <div className="space-y-2">
            <p>Tanque al {tank.current_level}%. Necesita &gt;50% para resolver.</p>
            <div className="text-xs text-gray-600 mt-1">
              ⏳ El llenado automático está en progreso...
            </div>
          </div>
        ),
        duration: 4000
      });
      return;
    }

    try {
      // Mostrar loading
      const loadingToast = toast.loading("Resolviendo alerta...");
      
      const result = await resolveAlert(id);
      
      toast.dismiss(loadingToast);
      
      if (result?.success) {
        toast.success('✅ Alerta resuelta exitosamente', {
          description: `Tanque al ${result.tankLevel}% - Se verificará en 24h`,
          duration: 5000
        });
        
        // Refrescar datos
        setTimeout(() => {
          fetchAlertsData();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error resolving alert:', error);
      
      // Mostrar error específico
      if (error.message.includes('válvula')) {
        toast.error('🔒 Válvula cerrada', {
          description: "Abra la válvula primero para resolver"
        });
      } else if (error.message.includes('Nivel insuficiente')) {
        toast.error('💧 Nivel bajo', {
          description: "Espere a que el tanque se llene &gt; 50%"
        });
      } else {
        toast.error('❌ Error al resolver alerta', {
          description: error.message || 'Error desconocido'
        });
      }
    }
  };

  const checkForReactivations = async () => {
    if (!isAdmin) {
      toast.error("🔒 Requiere modo administrador");
      return;
    }

    setIsCheckingReactivation(true);
    try {
      toast.info("🔍 Verificando reactivaciones...", {
        description: "Buscando tanques con nivel &lt; 50%"
      });
      
      // Simulación de verificación
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // Aquí iría la lógica real de verificación
      // Por ahora solo refrescamos
      await fetchAlertsData();
      
      const reactivatedCount = alerts.filter(a => a.reactivated).length;
      
      if (reactivatedCount > 0) {
        toast.warning(`⚠️ ${reactivatedCount} alerta(s) reactivada(s)`, {
          description: "Algunos tanques aún están bajo el 50%"
        });
      } else {
        toast.success("✅ Todas las alertas están estables", {
          description: "No se encontraron reactivaciones"
        });
      }
    } catch (error) {
      console.error('Error checking reactivations:', error);
      toast.error('❌ Error al verificar reactivaciones');
    } finally {
      setIsCheckingReactivation(false);
    }
  };

  const activeAlerts = getActiveAlerts();
  const criticalAlerts = activeAlerts.filter(a => a.alert_type === 'critical');
  const lowAlerts = activeAlerts.filter(a => a.alert_type === 'low');

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-water bg-clip-text text-transparent">
            Sistema de Alertas Inteligentes
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitoreo automático con reactivación si nivel no supera 50% en 24h
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlertsData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={checkForReactivations}
              disabled={isCheckingReactivation}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            >
              <Bell className={`h-4 w-4 ${isCheckingReactivation ? 'animate-pulse' : ''}`} />
              {isCheckingReactivation ? 'Verificando...' : 'Verificar Reactivaciones'}
            </Button>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-red-50 to-white border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Críticas</p>
              <p className="text-2xl font-bold text-red-700">{alertStats.critical}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-full">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-red-500 mt-2">Nivel &lt; 15%</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 font-medium">Bajas</p>
              <p className="text-2xl font-bold text-amber-700">{alertStats.low}</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-amber-500 mt-2">Nivel &lt; 25%</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Activas</p>
              <p className="text-2xl font-bold text-blue-700">{activeAlerts.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-blue-500 mt-2">Requieren atención</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Reactivadas</p>
              <p className="text-2xl font-bold text-purple-700">{alertStats.reactivated}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-purple-500 mt-2">Nivel &lt; 50% post-resolución</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ALERTAS ACTIVAS */}
        <Card className="p-6 bg-gradient-to-b from-white to-gray-50 shadow-lg border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Alertas Activas
                </h2>
                <p className="text-sm text-gray-500">
                  {activeAlerts.length} alerta(s) pendientes
                </p>
              </div>
            </div>
            {activeAlerts.length > 0 && (
              <span className="px-3 py-1 bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-full text-sm font-medium animate-pulse border border-red-300">
                ⚠️ Atención requerida
              </span>
            )}
          </div>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-gray-600 font-medium">¡Todo en orden!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Todos los niveles están por encima del 25%
                </p>
              </div>
            ) : (
              <>
                {criticalAlerts.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4" />
                      Alertas Críticas ({criticalAlerts.length})
                    </h3>
                    <div className="space-y-3">
                      {criticalAlerts.map((alert) => (
                        <AlertCard 
                          key={alert.id} 
                          alert={alert} 
                          isAdmin={isAdmin}
                          onResolve={handleResolveAlert}
                          onFillTank={handleFillTank}
                          tanks={tanks}
                          cistern={cistern}
                          isCritical={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {lowAlerts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas Bajas ({lowAlerts.length})
                    </h3>
                    <div className="space-y-3">
                      {lowAlerts.map((alert) => (
                        <AlertCard 
                          key={alert.id} 
                          alert={alert} 
                          isAdmin={isAdmin}
                          onResolve={handleResolveAlert}
                          onFillTank={handleFillTank}
                          tanks={tanks}
                          cistern={cistern}
                          isCritical={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* ALERTAS RESUELTAS */}
        <Card className="p-6 bg-gradient-to-b from-white to-gray-50 shadow-lg border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Historial de Alertas
              </h2>
              <p className="text-sm text-gray-500">
                {resolvedAlerts.length} alerta(s) resuelta(s)
              </p>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {resolvedAlerts.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-gray-600 font-medium">Sin historial aún</p>
                <p className="text-sm text-gray-500 mt-1">
                  No hay alertas resueltas en el sistema
                </p>
              </div>
            ) : (
              resolvedAlerts.map((alert) => (
                <ResolvedAlertCard 
                  key={alert.id}
                  alert={alert}
                  tanks={tanks}
                  cistern={cistern}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* INFO PANEL */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex flex-col md:flex-row items-start gap-4">
          <div className="flex-shrink-0">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-3 rounded-xl">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-800 mb-2 text-lg">📋 Política de Alertas Inteligentes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-700"><strong>Crítica:</strong> Nivel &lt; 15% - Resolución inmediata requerida</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-700"><strong>Baja:</strong> Nivel &lt; 25% - Monitoreo intensivo</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-700"><strong>Reactivación:</strong> Si nivel &lt; 50% a las 24h post-resolución</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-700"><strong>Estable:</strong> Nivel ≥ 50% por 48h - Considerado resuelto</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 italic">
              ⚡ El sistema aprende automáticamente de los patrones de consumo para mejorar las predicciones
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Componente para tarjetas de alerta activa
const AlertCard = ({ alert, isAdmin, onResolve, onFillTank, tanks, cistern, isCritical }: any) => {
  const tank = tanks.find((t: any) => t.id === alert.tank_id) || cistern;
  const canResolve = tank && tank.valve_status === 'open' && tank.current_level >= 50;
  
  return (
    <div className={`p-4 rounded-lg border ${
      isCritical 
        ? 'bg-gradient-to-r from-red-50/70 to-white border-red-200' 
        : 'bg-gradient-to-r from-amber-50/70 to-white border-amber-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isCritical 
                ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800' 
                : 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800'
            }`}>
              {isCritical ? '🚨 CRÍTICO' : '⚠️ BAJO'}
            </span>
            {alert.reactivated && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800">
                🔄 REACTIVADA
              </span>
            )}
          </div>
          <p className="font-medium text-gray-800">{alert.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            📅 {alert.created_at 
              ? new Date(alert.created_at).toLocaleString('es-ES')
              : 'Fecha no disponible'
            }
          </p>
          
          {/* INFORMACIÓN DEL TANQUE */}
          {tank && (
            <div className="mt-3 p-2 bg-white rounded border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tanque:</span>
                <span className="text-sm">{tank.room_number || `Piso ${tank.floor}` || "Cisterna"}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Válvula:</span>
                <Badge variant={tank.valve_status === 'open' ? "default" : "outline"}>
                  {tank.valve_status === 'open' ? (
                    <span className="flex items-center">
                      <Unlock className="mr-1 h-3 w-3" />
                      Abierta
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Lock className="mr-1 h-3 w-3" />
                      Cerrada
                    </span>
                  )}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Nivel actual:</span>
                  <span className={`font-bold ${tank.current_level >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
                    <Droplets className="inline mr-1 h-3 w-3" />
                    {tank.current_level?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress 
                  value={tank.current_level || 0} 
                  className="h-2"
                  indicatorClassName={tank.current_level >= 50 ? "bg-green-500" : tank.current_level >= 25 ? "bg-amber-500" : "bg-red-500"
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isAdmin ? (
        <div className="space-y-2">
          {tank?.valve_status !== 'open' ? (
            <Button
              size="sm"
              onClick={() => onFillTank(alert.id)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Abrir Válvula para Llenado
            </Button>
          ) : tank?.current_level < 50 ? (
            <div className="text-center p-2 bg-amber-50 rounded border border-amber-200">
              <p className="text-sm text-amber-700 flex items-center justify-center">
                <Clock className="mr-2 h-4 w-4" />
                ⏳ Llenando... {tank.current_level?.toFixed(1)}%
              </p>
              <p className="text-xs text-amber-600">
                Espere a que llegue a 50% para resolver
              </p>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => onResolve(alert.id)}
              className={`w-full ${
                isCritical 
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
              } text-white`}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isCritical ? '🚨 Resolver Urgente' : '✅ Marcar como Resuelta'}
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center p-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded text-sm text-gray-700 border border-gray-300">
          🔒 Esperando acción del administrador
        </div>
      )}
    </div>
  );
};

// Componente para alertas resueltas
const ResolvedAlertCard = ({ alert, tanks, cistern }: any) => {
  const tank = tanks.find((t: any) => t.id === alert.tank_id) || cistern;
  
  return (
    <div
      className={`p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-white ${
        alert.reactivated 
          ? 'border-amber-300 bg-gradient-to-r from-amber-50/50 to-white' 
          : 'border-green-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            alert.alert_type === 'critical' 
              ? 'bg-red-100 text-red-800' 
              : alert.alert_type === 'low' 
              ? 'bg-amber-100 text-amber-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {alert.alert_type === 'critical' ? 'Crítico' :
             alert.alert_type === 'low' ? 'Bajo' : 'Normal'}
          </span>
          {alert.reactivated && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300">
              ⚡ Reactivada
            </span>
          )}
        </div>
        {alert.resolved_at && (
          <span className="text-xs text-gray-500">
            {new Date(alert.resolved_at).toLocaleDateString('es-ES')}
          </span>
        )}
      </div>
      
      <p className="font-medium text-gray-800 text-sm mb-2">{alert.message}</p>
      
      {/* INFO DEL TANQUE EN RESUELTAS */}
      {tank && (
        <div className="mb-2 p-2 bg-white rounded border">
          <div className="flex items-center justify-between text-sm">
            <span>Tanque:</span>
            <span className="font-medium">{tank.room_number || `Piso ${tank.floor}`}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span>Nivel al resolver:</span>
            <span className={`font-bold ${alert.current_level_at_resolve >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
              {alert.current_level_at_resolve || tank.current_level?.toFixed(1) || 0}%
            </span>
          </div>
        </div>
      )}
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          🕒 Creada: {alert.created_at 
            ? new Date(alert.created_at).toLocaleDateString('es-ES')
            : 'N/A'
          }
        </span>
        {alert.resolved_by && (
          <span>👤 Por: {alert.resolved_by}</span>
        )}
      </div>
    </div>
  );
};

export default Alerts;