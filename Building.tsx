import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWaterStore } from "@/stores/waterStore";
import { WaterLevelCard } from "@/components/WaterLevelCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Building = () => {
  const { tanks, setTanks } = useWaterStore();
  const [selectedFloor, setSelectedFloor] = useState(2);
  const [selectedTank, setSelectedTank] = useState<any>(null);
  const [newLevel, setNewLevel] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchTanks();
  }, []);

  const fetchTanks = async () => {
    try {
      const { data, error } = await supabase
        .from('water_tanks')
        .select('*')
        .order('floor', { ascending: true });

      if (error) throw error;
      setTanks(data || []);
    } catch (error) {
      console.error('Error fetching tanks:', error);
      toast.error('Error al cargar los tanques');
    }
  };

  const handleTankClick = (tank: any) => {
    setSelectedTank(tank);
    setNewLevel(tank.current_level.toString());
    setIsDialogOpen(true);
  };

  const handleUpdateLevel = async () => {
    if (!selectedTank || !newLevel) return;

    const level = parseFloat(newLevel);
    if (isNaN(level) || level < 0 || level > 100) {
      toast.error('El nivel debe estar entre 0 y 100%');
      return;
    }

    try {
      const { error } = await supabase
        .from('water_tanks')
        .update({ current_level: level })
        .eq('id', selectedTank.id);

      if (error) throw error;

      toast.success('Nivel actualizado correctamente');
      setIsDialogOpen(false);
      fetchTanks();
    } catch (error) {
      console.error('Error updating tank:', error);
      toast.error('Error al actualizar el nivel');
    }
  };

  const floorTanks = tanks.filter(tank => tank.floor === selectedFloor);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-water bg-clip-text text-transparent">
          Edificio IMS2
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualización de tanques por piso (11 pisos, 10 habitaciones cada uno)
        </p>
      </div>

      <Tabs value={selectedFloor.toString()} onValueChange={(val) => setSelectedFloor(parseInt(val))}>
        <TabsList className="flex flex-wrap h-auto">
          {Array.from({ length: 10 }, (_, i) => i + 2).map((floor) => (
            <TabsTrigger key={floor} value={floor.toString()} className="flex-1 min-w-[80px]">
              Piso {floor}
            </TabsTrigger>
          ))}
        </TabsList>

        {Array.from({ length: 10 }, (_, i) => i + 2).map((floor) => (
          <TabsContent key={floor} value={floor.toString()} className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {floorTanks.map((tank) => (
                <WaterLevelCard
                  key={tank.id}
                  roomNumber={tank.room_number}
                  level={tank.current_level}
                  capacity={tank.capacity_liters}
                  onClick={() => handleTankClick(tank)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Nivel - Habitación {selectedTank?.room_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-level">Nivel Actual</Label>
              <p className="text-2xl font-bold text-primary">{selectedTank?.current_level.toFixed(1)}%</p>
            </div>
            <div>
              <Label htmlFor="new-level">Nuevo Nivel (%)</Label>
              <Input
                id="new-level"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                placeholder="Ingrese el nuevo nivel"
              />
            </div>
            <Button onClick={handleUpdateLevel} className="w-full">
              Actualizar Nivel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Building;
