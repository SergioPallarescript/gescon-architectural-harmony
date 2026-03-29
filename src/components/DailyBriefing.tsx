import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Cloud, Sun, CloudRain, Snowflake, Wind, Target, FileSignature } from "lucide-react";

interface BriefingProps {
  projectId: string;
  projectAddress?: string | null;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  recommendation: string;
}

const DailyBriefing = ({ projectId, projectAddress }: BriefingProps) => {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [todayTasks, setTodayTasks] = useState<string[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState(0);
  const [openOrders, setOpenOrders] = useState(0);

  useEffect(() => {
    const fetchBriefing = async () => {
      const today = new Date().toISOString().split("T")[0];

      // Gantt tasks for today
      const { data: milestones } = await supabase
        .from("gantt_milestones")
        .select("title, start_date, end_date")
        .eq("project_id", projectId)
        .lte("start_date", today)
        .gte("end_date", today);
      setTodayTasks((milestones || []).map((m: any) => m.title));

      // Pending order validations
      const { data: pendingOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("project_id", projectId)
        .eq("requires_validation", true);
      setOpenOrders((pendingOrders || []).length);

      // Pending CFO items
      const { data: cfoItems } = await supabase
        .from("cfo_items")
        .select("id")
        .eq("project_id", projectId)
        .eq("is_completed", false);
      setPendingSignatures((cfoItems || []).length);

      // Simple weather based on geolocation
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`
        );
        const data = await res.json();
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weathercode;
        const desc = code <= 1 ? "Despejado" : code <= 3 ? "Nublado" : code <= 65 ? "Lluvia" : code <= 77 ? "Nieve" : "Tormenta";
        let recommendation = "Apto para trabajos exteriores.";
        if (code > 3 && code <= 65) recommendation = "Lluvia prevista. Precaución con trabajos de hormigonado y pintura exterior.";
        else if (code > 65) recommendation = "Condiciones adversas. Evaluar suspensión de trabajos en altura.";
        setWeather({ temp, description: desc, icon: code <= 1 ? "sun" : code <= 3 ? "cloud" : code <= 65 ? "rain" : "snow", recommendation });
      } catch {
        setWeather({ temp: 0, description: "No disponible", icon: "cloud", recommendation: "No se pudo obtener datos meteorológicos." });
      }
    };
    fetchBriefing();
  }, [projectId]);

  const WeatherIcon = weather?.icon === "sun" ? Sun : weather?.icon === "rain" ? CloudRain : weather?.icon === "snow" ? Snowflake : Cloud;

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <h3 className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Briefing del Día
      </h3>

      {/* Weather */}
      {weather && weather.description !== "No disponible" && (
        <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
          <WeatherIcon className="h-8 w-8 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">{weather.temp}°C — {weather.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{weather.recommendation}</p>
          </div>
        </div>
      )}

      {/* Today's tasks */}
      {todayTasks.length > 0 && (
        <div>
          <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Target className="h-3 w-3" /> Foco del Día
          </p>
          <div className="space-y-1">
            {todayTasks.map((task, i) => (
              <p key={i} className="text-xs pl-3 border-l-2 border-primary/40 py-0.5">{task}</p>
            ))}
          </div>
        </div>
      )}

      {/* Counters */}
      <div className="flex gap-3">
        {pendingSignatures > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/30 px-2.5 py-1.5 rounded">
            <FileSignature className="h-3 w-3" />
            <span>{pendingSignatures} puntos CFO pendientes</span>
          </div>
        )}
        {openOrders > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/30 px-2.5 py-1.5 rounded">
            <Wind className="h-3 w-3" />
            <span>{openOrders} órdenes requieren validación</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyBriefing;
