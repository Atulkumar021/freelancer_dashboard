import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";

import { AuthProvider }          from "@/contexts/AuthContext";
import { ProtectedRoute }        from "@/components/ProtectedRoute";
import { Login }                 from "@/pages/Login";
import { Users }                 from "@/pages/Users";
import { DashboardLayout }       from "@/components/dashboard/DashboardLayout";
import { ExecutiveOverview }     from "@/components/dashboard/pages/ExecutiveOverview";
import { SalesReceivables }      from "@/components/dashboard/pages/SalesReceivables";
import { PurchasesPayables }     from "@/components/dashboard/pages/PurchasesPayables";
import { ProfitLoss }            from "@/components/dashboard/pages/ProfitLoss";
import { BalanceSheet }          from "@/components/dashboard/pages/BalanceSheet";
import { CashFlow }              from "@/components/dashboard/pages/CashFlow";
import { Compliance }            from "@/components/dashboard/pages/Compliance";
import { Ratios }                from "@/components/dashboard/pages/Ratios";
import { Documents }             from "@/components/dashboard/pages/Documents";
import { Alerts }                from "@/components/dashboard/pages/Alerts";
import { Settings }              from "@/components/dashboard/pages/Settings";
import { GenericPage }           from "@/components/dashboard/pages/GenericPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected dashboard */}
          <Route path="/*" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="/"              element={<Navigate to="/executive" replace />} />
                  <Route path="/executive"     element={<ExecutiveOverview />} />
                  <Route path="/sales"         element={<SalesReceivables />} />
                  <Route path="/purchases"     element={<PurchasesPayables />} />
                  <Route path="/pnl"           element={<ProfitLoss />} />
                  <Route path="/balance-sheet" element={<BalanceSheet />} />
                  <Route path="/cashflow"      element={<CashFlow />} />
                  <Route path="/inventory"     element={<GenericPage title="Inventory & Working Capital" description="Stock levels, working capital cycle and gap analysis." sections={["Inventory summary","Working capital cycle","Stock ageing","Reorder alerts"]} />} />
                  <Route path="/compliance"    element={<Compliance />} />
                  <Route path="/ratios"        element={<Ratios />} />
                  <Route path="/insights"      element={<GenericPage title="Insights & Management Reports" description="AI-generated insights, variance reports and management commentary." sections={["Management commentary","Key financial insights","Variance reports","Risk reports","Action tracker"]} />} />
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
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
