"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export type Vehicle = { id: string; name: string; year: number | null; make: string | null; model: string | null };
export type Maintenance = { id: string; vehicle_id: string; description: string; cost: number | null; service_date: string; mileage: number | null };

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function addVehicle(input: { name: string; year: string; make: string; model: string }): Promise<{ vehicle: Vehicle | null; error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { vehicle: null, error: "You must be logged in." };
  if (membership.error) return { vehicle: null, error: membership.error };
  if (!membership.householdId) return { vehicle: null, error: "You do not belong to a household." };
  if (!input || typeof input !== "object") return { vehicle: null, error: "Enter valid vehicle details." };

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const make = typeof input.make === "string" ? input.make.trim() : "";
  const model = typeof input.model === "string" ? input.model.trim() : "";
  const yearText = typeof input.year === "string" ? input.year.trim() : "";
  const year = yearText ? Number(yearText) : null;
  if (!name) return { vehicle: null, error: "Enter a vehicle name." };
  if (name.length > 80 || make.length > 60 || model.length > 60) return { vehicle: null, error: "Vehicle details are too long." };
  if (yearText && (!Number.isInteger(year) || year! < 1886 || year! > new Date().getFullYear() + 1)) return { vehicle: null, error: "Enter a valid model year." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicles")
    .insert({ household_id: membership.householdId, name, year, make: make || null, model: model || null })
    .select("id, name, year, make, model").single();
  if (error || !data) return { vehicle: null, error: error?.message ?? "Unable to add vehicle." };
  revalidatePath("/cars");
  return { vehicle: { ...data, year: data.year === null ? null : Number(data.year) }, error: null };
}

export async function addMaintenance(input: { vehicleId: string; description: string; cost: string; serviceDate: string; mileage: string }): Promise<{ maintenance: Maintenance | null; error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { maintenance: null, error: "You must be logged in." };
  if (membership.error) return { maintenance: null, error: membership.error };
  if (!membership.householdId) return { maintenance: null, error: "You do not belong to a household." };
  if (!input || typeof input !== "object" || !/^[0-9a-f-]{36}$/i.test(input.vehicleId)) return { maintenance: null, error: "Choose a valid vehicle." };

  const description = typeof input.description === "string" ? input.description.trim() : "";
  const serviceDate = typeof input.serviceDate === "string" ? input.serviceDate : "";
  const costText = typeof input.cost === "string" ? input.cost.trim() : "";
  const mileageText = typeof input.mileage === "string" ? input.mileage.trim() : "";
  const cost = costText ? Number(costText) : null;
  const mileage = mileageText ? Number(mileageText) : null;
  if (!description) return { maintenance: null, error: "Enter a service description." };
  if (description.length > 160) return { maintenance: null, error: "Descriptions must be 160 characters or fewer." };
  if (!validDate(serviceDate)) return { maintenance: null, error: "Choose a valid service date." };
  if (costText && (!Number.isFinite(cost) || cost! < 0 || cost! > 99999999.99)) return { maintenance: null, error: "Enter a valid cost." };
  if (!mileageText || !Number.isInteger(mileage) || mileage! < 0 || mileage! > 2147483647) return { maintenance: null, error: "Enter a valid mileage." };

  const supabase = await createClient();
  const { data: vehicle, error: vehicleError } = await supabase.from("vehicles").select("id")
    .eq("id", input.vehicleId).eq("household_id", membership.householdId).maybeSingle();
  if (vehicleError || !vehicle) return { maintenance: null, error: vehicleError?.message ?? "Vehicle not found." };
  const { data, error } = await supabase.from("vehicle_maintenance")
    .insert({ vehicle_id: vehicle.id, description, cost, service_date: serviceDate, mileage })
    .select("id, vehicle_id, description, cost, service_date, mileage").single();
  if (error || !data) return { maintenance: null, error: error?.message ?? "Unable to add maintenance." };
  revalidatePath("/cars");
  return { maintenance: { ...data, cost: data.cost === null ? null : Number(data.cost), mileage: data.mileage === null ? null : Number(data.mileage) }, error: null };
}
