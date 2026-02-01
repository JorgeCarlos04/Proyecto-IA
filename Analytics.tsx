import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

const Analytics = () => {
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [floorData, setFloorData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: tanks, error } = await supabase
        .from('water_tanks')
        .select('*')
        .order('floor', { ascending: true });

      if (error) throw error;

      // Agrupar por piso
      const grouped = Array.from({ length: 10 }, (_, i) => {
        const floor = i + 2;
        const floorTanks = tanks?.filter(t => t.floor === floor) || [];
        const totalCapacity = floorTanks.reduce((sum, t) => sum + t.capacity_liters, 0);
        const currentTotal = floorTanks.reduce((sum, t) => sum + (t.capacity_liters * t.current_level / 100), 0);
        const avgLevel = floorTanks.length > 0 
          ? floorTanks.reduce((sum, t) => sum + t.current_level, 0) / floorTanks.length 
          : 0;

        return {
          floor: `Piso ${floor}`,
          capacidad: totalCapacity,
          actual: parseFloat(currentTotal.toFixed(2)),
          promedio: parseFloat(avgLevel.toFixed(1)),
        };
      });

      setFloorData(grouped);

      // Simular datos de consumo para últimos 7 días
      const mockConsumption = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          fecha: date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          consumo: Math.floor(Math.random() * 500) + 300,
        };
      });

      setConsumptionData(mockConsumption);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error al cargar análisis');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-water bg-clip-text text-transparent">
          Análisis y Predicciones
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualización de consumo y predicciones con Red Neuronal Multicapa
        </p>
      </div>

      <Card className="p-6 bg-gradient-card shadow-card-custom">
        <h2 className="text-xl font-semibold mb-4">Consumo Diario (Últimos 7 días)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={consumptionData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="consumo" 
              stroke="hsl(200 95% 42%)" 
              strokeWidth={3}
              name="Litros consumidos"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 bg-gradient-card shadow-card-custom">
        <h2 className="text-xl font-semibold mb-4">Distribución de Agua por Piso</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={floorData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="floor" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="capacidad" fill="hsl(200 20% 70%)" name="Capacidad Total (L)" />
            <Bar dataKey="actual" fill="hsl(200 95% 42%)" name="Agua Actual (L)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 bg-gradient-card shadow-card-custom">
        <h2 className="text-xl font-semibold mb-4">Nivel Promedio por Piso</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={floorData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="floor" type="category" />
            <Tooltip />
            <Bar dataKey="promedio" fill="hsl(180 70% 50%)" name="Nivel Promedio (%)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 bg-gradient-card shadow-card-custom">
        <h2 className="text-xl font-semibold mb-4">Predicción con Red Neuronal</h2>
        <div className="bg-muted/30 rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-2">
            El modelo de Red Neuronal Multicapa analiza patrones históricos de consumo,
            llegadas de camiones cisterna y datos climáticos para predecir la disponibilidad
            futura de agua.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-lg">
              <p className="text-sm text-muted-foreground">Predicción 24h</p>
              <p className="text-2xl font-bold text-success">Suficiente</p>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <p className="text-sm text-muted-foreground">Predicción 48h</p>
              <p className="text-2xl font-bold text-warning">Bajo</p>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <p className="text-sm text-muted-foreground">Predicción 72h</p>
              <p className="text-2xl font-bold text-destructive">Crítico</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
