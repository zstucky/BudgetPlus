import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../bottom-nav";
import CarsDashboard from "./cars-dashboard";
import type { Maintenance, Vehicle } from "./actions";

export default async function CarsPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <CarsLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, name, year, make, model")
    .eq("household_id", membership.householdId)
    .order("created_at", { ascending: true });

  if (error) return <CarsLoadError message={error.message} />;
  const vehicles: Vehicle[] = (data ?? []).map((vehicle) => ({
    ...vehicle,
    year: vehicle.year === null ? null : Number(vehicle.year),
  }));
  let maintenance: Maintenance[] = [];
  if (vehicles.length) {
    const historyResult = await supabase
      .from("vehicle_maintenance")
      .select("id, vehicle_id, description, cost, service_date, mileage")
      .in("vehicle_id", vehicles.map((vehicle) => vehicle.id))
      .order("service_date", { ascending: false });
    if (historyResult.error) return <CarsLoadError message={historyResult.error.message} />;
    maintenance = (historyResult.data ?? []).map((entry) => ({
      ...entry,
      cost: entry.cost === null ? null : Number(entry.cost),
      mileage: entry.mileage === null ? null : Number(entry.mileage),
    }));
  }

  return <main className="monthly-page"><BottomNav /><CarsDashboard initialVehicles={vehicles} initialMaintenance={maintenance} /></main>;
}

function CarsLoadError({ message }: { message: string }) {
  return <main className="monthly-page"><BottomNav /><section className="monthly-content"><h1>Cars</h1><p className="monthly-error" role="alert">We couldn&apos;t load your vehicles: {message}</p></section></main>;
}
