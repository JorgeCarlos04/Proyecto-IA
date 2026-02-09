// App.tsx - MODIFICAR
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import Building from "./pages/Building";
//import Trucks from "./pages/Trucks";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";
import { AdminToggle } from "./components/AdminToggle"; // ✅ NUEVO IMPORT
import { useAdminStore } from "./stores/adminStore"; // ✅ NUEVO IMPORT

const queryClient = new QueryClient();

const App = () => {
  const { isAdmin } = useAdminStore(); // ✅ NUEVO

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
              <AppSidebar />
              <div className="flex-1 flex flex-col">
                <header className="h-14 border-b flex items-center justify-between px-6 bg-card shadow-sm">
                  <SidebarTrigger />
                  <AdminToggle /> {/* ✅ NUEVO: Toggle admin en header */}
                </header>
                <main className="flex-1 p-6 overflow-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/building" element={<Building />} />
                    
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                {/* ✅ NUEVO: Badge de modo admin */}
                {!isAdmin && (
                  <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                    🔒 Modo Consulta - Solo visualización
                  </div>
                )}
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;