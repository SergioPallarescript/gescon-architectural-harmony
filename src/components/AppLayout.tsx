import { ReactNode } from "react";
import AppHeader from "./AppHeader";

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background concrete-bg relative">
      <AppHeader />
      <main className="relative z-10">
        {children}
      </main>
      <footer className="legal-footer relative z-10">
        Su actividad y conformidad están siendo legalmente registradas
      </footer>
    </div>
  );
};

export default AppLayout;
