import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Report from "./pages/Report";
import ForecastComparison from "./pages/ForecastComparison";
import InvestorReport from "./pages/InvestorReport";
import SlowFolkResearch from "./pages/SlowFolkResearch";
import NotFound from "./pages/NotFound";
import { PasswordGate } from "./components/PasswordGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/report" element={<Report />} />
          <Route path="/forecast-comparison" element={<PasswordGate><ForecastComparison /></PasswordGate>} />
          <Route path="/investor-report" element={<PasswordGate><InvestorReport /></PasswordGate>} />
          <Route path="/slow-folk-research" element={<PasswordGate><SlowFolkResearch /></PasswordGate>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
