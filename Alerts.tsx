import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWaterStore } from "@/stores/waterStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle } from "lucide-react";

const Alerts = () => {
  const { alerts, setAlerts } = useWaterStore();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('water_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Error al cargar alertas');
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('water_alerts')
        .update({ is_resolved: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Alerta resuelta');
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Error al resolver alerta');
    }
  };

  const activeAlerts = alerts.filter(a => !a.is_resolved);
  const resolvedAlerts = alerts.filter(a => a.is_resolved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-water bg-clip-text text-transparent">
          Sistema de Alertas
        </h1>
        <p className="text-muted-foreground mt-2">
          Notificaciones automáticas de niveles críticos y bajos de agua
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-card shadow-card-custom">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold">Alertas Activas ({activeAlerts.length})</h2>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {activeAlerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay alertas activas
              </p>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border bg-card/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.alert_type === 'critical' ? 'bg-destructive/20 text-destructive' :
                        alert.alert_type === 'low' ? 'bg-warning/20 text-warning' :
                        'bg-success/20 text-success'
                      }`}>
                        {alert.alert_type === 'critical' ? 'Crítico' :
                         alert.alert_type === 'low' ? 'Bajo' : 'Normal'}
                      </span>
                      <p className="font-medium mt-2">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.created_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                    className="w-full"
                  >
                    Marcar como Resuelta
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 bg-gradient-card shadow-card-custom">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-success" />
            <h2 className="text-xl font-semibold">Alertas Resueltas ({resolvedAlerts.length})</h2>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {resolvedAlerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay alertas resueltas
              </p>
            ) : (
              resolvedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border bg-card/50 opacity-60"
                >
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.alert_type === 'critical' ? 'bg-destructive/20 text-destructive' :
                    alert.alert_type === 'low' ? 'bg-warning/20 text-warning' :
                    'bg-success/20 text-success'
                  }`}>
                    {alert.alert_type === 'critical' ? 'Crítico' :
                     alert.alert_type === 'low' ? 'Bajo' : 'Normal'}
                  </span>
                  <p className="font-medium mt-2">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Alerts;
