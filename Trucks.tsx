import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWaterStore } from "@/stores/waterStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Truck } from "lucide-react";

const Trucks = () => {
  const { trucks, setTrucks } = useWaterStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    truck_number: "",
    arrival_date: "",
    estimated_arrival: "",
    water_delivered_liters: "",
    notes: "",
  });

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    try {
      const { data, error } = await supabase
        .from('water_trucks')
        .select('*')
        .order('arrival_date', { ascending: false });

      if (error) throw error;
      setTrucks(data || []);
    } catch (error) {
      console.error('Error fetching trucks:', error);
      toast.error('Error al cargar los camiones');
    }
  };

  const handleSubmit = async () => {
    if (!formData.truck_number || !formData.arrival_date || !formData.water_delivered_liters) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      const { error } = await supabase.from('water_trucks').insert([{
        truck_number: formData.truck_number,
        arrival_date: formData.arrival_date,
        estimated_arrival: formData.estimated_arrival || null,
        water_delivered_liters: parseFloat(formData.water_delivered_liters),
        status: 'scheduled',
        notes: formData.notes || null,
      }]);

      if (error) throw error;

      toast.success('Camión registrado correctamente');
      setIsDialogOpen(false);
      setFormData({
        truck_number: "",
        arrival_date: "",
        estimated_arrival: "",
        water_delivered_liters: "",
        notes: "",
      });
      fetchTrucks();
    } catch (error) {
      console.error('Error adding truck:', error);
      toast.error('Error al registrar el camión');
    }
  };

  const updateStatus = async (id: string, status: 'scheduled' | 'arrived' | 'delivered') => {
    try {
      const { error } = await supabase
        .from('water_trucks')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success('Estado actualizado');
      fetchTrucks();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-water bg-clip-text text-transparent">
            Gestión de Camiones Cisterna
          </h1>
          <p className="text-muted-foreground mt-2">
            Registro y seguimiento de entregas de agua
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Camión
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trucks.map((truck) => (
          <Card key={truck.id} className="p-6 bg-gradient-card shadow-card-custom">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{truck.truck_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(truck.arrival_date).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Truck className="h-6 w-6 text-primary" />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Agua entregada:</span>
                <span className="font-semibold">{truck.water_delivered_liters}L</span>
              </div>
              {truck.notes && (
                <p className="text-sm text-muted-foreground mt-2">{truck.notes}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={truck.status === 'scheduled' ? 'default' : 'outline'}
                onClick={() => updateStatus(truck.id, 'scheduled')}
                className="flex-1"
              >
                Programado
              </Button>
              <Button
                size="sm"
                variant={truck.status === 'arrived' ? 'default' : 'outline'}
                onClick={() => updateStatus(truck.id, 'arrived')}
                className="flex-1"
              >
                Llegó
              </Button>
              <Button
                size="sm"
                variant={truck.status === 'delivered' ? 'default' : 'outline'}
                onClick={() => updateStatus(truck.id, 'delivered')}
                className="flex-1"
              >
                Entregado
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Camión Cisterna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="truck_number">Número de Camión *</Label>
              <Input
                id="truck_number"
                value={formData.truck_number}
                onChange={(e) => setFormData({ ...formData, truck_number: e.target.value })}
                placeholder="Ej: C-001"
              />
            </div>
            <div>
              <Label htmlFor="arrival_date">Fecha de Llegada *</Label>
              <Input
                id="arrival_date"
                type="datetime-local"
                value={formData.arrival_date}
                onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="water_delivered_liters">Litros de Agua *</Label>
              <Input
                id="water_delivered_liters"
                type="number"
                value={formData.water_delivered_liters}
                onChange={(e) => setFormData({ ...formData, water_delivered_liters: e.target.value })}
                placeholder="Ej: 5000"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
            <Button onClick={handleSubmit} className="w-full">
              Registrar Camión
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trucks;
