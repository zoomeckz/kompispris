import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import WorksPage from "./pages/WorksPage";
import TransfersPage from "./pages/TransfersPage";
import RevenuePage from "./pages/RevenuePage";
import PayoutsPage from "./pages/PayoutsPage";
import SupportPage from "./pages/SupportPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/works" element={<WorksPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/revenue" element={<RevenuePage />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
