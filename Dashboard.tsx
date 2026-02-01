import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWaterStore } from "@/stores/waterStore";
import { DashboardStats } from "@/components/DashboardStats";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Dashboard = () => {
  const { tanks, trucks, alerts, setTanks, setTrucks, setAlerts } = useWaterStore();

  useEffect(() => {
    fetchData();
    
    // Suscripción en tiempo real
    const channel = supabase
      .channel('water-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_tanks' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [tanksRes, trucksRes, alertsRes] = await Promise.all([
        supabase.from('water_tanks').select('*').order('floor', { ascending: true }),
        supabase.from('water_trucks').select('*').order('arrival_date', { ascending: false }).limit(5),
        // ✅ CORREGIDO: Usar endpoint base sin .eq()
        supabase.from('water_alerts').select('*').order('created_at', { ascending: false }),
      ]);

      if (tanksRes.error) throw tanksRes.error;
      if (trucksRes.error) throw trucksRes.error;
      if (alertsRes.error) throw alertsRes.error;

      setTanks(tanksRes.data || []);
      setTrucks(trucksRes.data || []);
      // ✅ CORREGIDO: Filtrar alertas activas en el frontend
      const activeAlerts = (alertsRes.data || []).filter(alert => !alert.is_resolved);
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    }
  };

  const averageLevel = tanks.length > 0
    ? tanks.reduce((sum, tank) => sum + tank.current_level, 0) / tanks.length
    : 0;

  const criticalTanks = tanks.filter(tank => tank.current_level < 25).length;
  
  const nextTruck = trucks.find(t => t.status === 'scheduled');
  const nextTruckDate = nextTruck 
    ? new Date(nextTruck.estimated_arrival || nextTruck.arrival_date).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : undefined;

  // Datos para gráfica (por piso)
  const chartData = Array.from({ length: 10 }, (_, i) => {
    const floor = i + 2;
    const floorTanks = tanks.filter(t => t.floor === floor);
    const avg = floorTanks.length > 0
      ? floorTanks.reduce((sum, t) => sum + t.current_level, 0) / floorTanks.length
      : 0;
    return {
      floor: `Piso ${floor}`,
      nivel: parseFloat(avg.toFixed(1)),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-water bg-clip-text text-transparent">
          Dashboard General
        </h1>
        <p className="text-muted-foreground mt-2">
          Sistema de Gestión Hídrica - Edificio IMS2
        </p>
      </div>

      <DashboardStats
        totalTanks={tanks.length}
        averageLevel={averageLevel}
        criticalTanks={criticalTanks}
        nextTruck={nextTruckDate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-card shadow-card-custom">
          <h2 className="text-xl font-semibold mb-4">Nivel Promedio por Piso</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorNivel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(200 95% 42%)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(200 95% 42%)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="floor" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="nivel" 
                stroke="hsl(200 95% 42%)" 
                fillOpacity={1} 
                fill="url(#colorNivel)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-gradient-card shadow-card-custom">
          <h2 className="text-xl font-semibold mb-4">Alertas Activas</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay alertas activas
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.created_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.alert_type === 'critical' ? 'bg-destructive/20 text-destructive' :
                      alert.alert_type === 'low' ? 'bg-warning/20 text-warning' :
                      'bg-success/20 text-success'
                    }`}>
                      {alert.alert_type === 'critical' ? 'Crítico' :
                       alert.alert_type === 'low' ? 'Bajo' : 'Normal'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;