import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";

import { AuthProvider }          from "@/contexts/AuthContext";
import { FilterProvider }        from "@/contexts/FilterContext";
import { ThemeProvider }         from "@/contexts/ThemeContext";
import { ProtectedRoute }        from "@/components/ProtectedRoute";
import { Login }                 from "@/pages/Login";
import { Users }                 from "@/pages/Users";
import { DashboardLayout }       from "@/components/dashboard/DashboardLayout";
import { FiltersPanel }          from "@/components/dashboard/FiltersPanel";
import { AiCfoHome }             from "@/components/dashboard/pages/AiCfoHome";
import { ExecutiveOverview }     from "@/components/dashboard/pages/ExecutiveOverview";
import { SalesReceivables }      from "@/components/dashboard/pages/SalesReceivables";
import { PurchasesPayables }     from "@/components/dashboard/pages/PurchasesPayables";
import { ProfitLoss }            from "@/components/dashboard/pages/ProfitLoss";
import { BalanceSheet }          from "@/components/dashboard/pages/BalanceSheet";
import { CashFlow }              from "@/components/dashboard/pages/CashFlow";
import { Inventory }             from "@/components/dashboard/pages/Inventory";
import { Compliance }            from "@/components/dashboard/pages/Compliance";
import { Ratios }                from "@/components/dashboard/pages/Ratios";
import { Insights }              from "@/components/dashboard/pages/Insights";
import { Documents }             from "@/components/dashboard/pages/Documents";
import { Alerts }                from "@/components/dashboard/pages/Alerts";
import { Settings }              from "@/components/dashboard/pages/Settings";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
       <AuthProvider>
        <FilterProvider>
          <Routes>

            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected dashboard */}
            <Route path="/*" element={
              <ProtectedRoute>
                {/* FiltersPanel lives outside DashboardLayout so it overlays everything */}
                <FiltersPanel />
                <DashboardLayout>
                  <Routes>
                    <Route path="/"              element={<AiCfoHome />} />
                    <Route path="/home"          element={<Navigate to="/" replace />} />
                    <Route path="/executive"     element={<ExecutiveOverview />} />
                    <Route path="/sales"         element={<SalesReceivables />} />
                    <Route path="/purchases"     element={<PurchasesPayables />} />
                    <Route path="/pnl"           element={<ProfitLoss />} />
                    <Route path="/balance-sheet" element={<BalanceSheet />} />
                    <Route path="/cashflow"      element={<CashFlow />} />
                    <Route path="/inventory"     element={<Inventory />} />
                    <Route path="/compliance"    element={<Compliance />} />
                    <Route path="/ratios"        element={<Ratios />} />
                    <Route path="/insights"      element={<Insights />} />
                    <Route path="/documents"     element={<Documents />} />
                    <Route path="/alerts"        element={<Alerts />} />
                    <Route path="/settings"      element={<Settings />} />

                    {/* Admin-only */}
                    <Route path="/users" element={
                      <ProtectedRoute roles={['superadmin', 'admin']}>
                        <Users />
                      </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/executive" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            } />

          </Routes>
        </FilterProvider>
       </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
