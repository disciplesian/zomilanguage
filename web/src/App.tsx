import { Suspense, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { warmUpDictionary } from "@/lib/dictionary";

import Translate from "./pages/Translate";
import Dictionary from "./pages/Dictionary";
import HistoryPage from "./pages/History";
import Settings from "./pages/Settings";
import { AboutPage, HelpPage, PrivacyPage, TermsPage } from "./pages/InfoPages";
import NotFound from "./pages/NotFound";

// Rarely used pages load on demand to keep the first load fast.
const Admin = lazy(() => import("./pages/Admin"));
const SharedTranslation = lazy(() => import("./pages/SharedTranslation"));
const PrivacyChoices = lazy(() => import("./pages/PrivacyChoices"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const App = () => {
  useEffect(() => {
    warmUpDictionary();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster position="bottom-center" />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<div className="min-h-[100dvh] bg-[#2a2f45]" />}>
            <Routes>
              <Route path="/" element={<Translate />} />
              <Route path="/translate" element={<Translate />} />
              <Route path="/dictionary" element={<Dictionary />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/account" element={<Navigate to="/settings" replace />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/support" element={<HelpPage />} />
              <Route path="/help" element={<Navigate to="/support" replace />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy-choices" element={<PrivacyChoices />} />
              <Route path="/t/:id" element={<SharedTranslation />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
