"use client";

import { useState, type FormEvent } from "react";
import { addMaintenance, addVehicle, type Maintenance, type Vehicle } from "./actions";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function vehicleDetails(vehicle: Vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
}

export default function CarsDashboard({ initialVehicles, initialMaintenance }: { initialVehicles: Vehicle[]; initialMaintenance: Maintenance[] }) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [history, setHistory] = useState(initialMaintenance);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSavingVehicle(true);
    setError(null);
    try {
      const result = await addVehicle({ name: String(form.get("name") ?? ""), year: String(form.get("year") ?? ""), make: String(form.get("make") ?? ""), model: String(form.get("model") ?? "") });
      if (result.error || !result.vehicle) { setError(result.error ?? "Unable to add vehicle."); return; }
      setVehicles((current) => [...current, result.vehicle!]);
      setExpandedId(result.vehicle.id);
      setShowAdd(false);
      formElement.reset();
    } finally { setSavingVehicle(false); }
  }

  async function createMaintenance(event: FormEvent<HTMLFormElement>, vehicleId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSavingMaintenance(true);
    setError(null);
    try {
      const result = await addMaintenance({ vehicleId, description: String(form.get("description") ?? ""), cost: String(form.get("cost") ?? ""), serviceDate: String(form.get("service-date") ?? ""), mileage: String(form.get("mileage") ?? "") });
      if (result.error || !result.maintenance) { setError(result.error ?? "Unable to add service record."); return; }
      setHistory((current) => [result.maintenance!, ...current].sort((a, b) => {
        if (a.mileage === null) return b.mileage === null ? b.service_date.localeCompare(a.service_date) : 1;
        if (b.mileage === null) return -1;
        return b.mileage - a.mileage || b.service_date.localeCompare(a.service_date);
      }));
      formElement.reset();
      setMaintenanceDate(new Date().toLocaleDateString("en-CA"));
    } finally { setSavingMaintenance(false); }
  }

  return (
    <section className="monthly-content cars-content" aria-labelledby="cars-title">
      <header className="monthly-heading"><h1 id="cars-title">Cars</h1></header>

      <section className="cars-vehicles" aria-labelledby="vehicles-title">
        <div className="monthly-list-heading"><h2 id="vehicles-title">Your vehicles</h2><span>{vehicles.length}</span></div>
        {vehicles.length ? <ul>{vehicles.map((vehicle) => {
          const entries = history.filter((entry) => entry.vehicle_id === vehicle.id);
          const expanded = expandedId === vehicle.id;
          return <li className="cars-vehicle-item" key={vehicle.id}>
            <button type="button" className="cars-vehicle-toggle" aria-expanded={expanded} onClick={() => { setExpandedId(expanded ? null : vehicle.id); setError(null); }}>
              <span className="cars-vehicle-icon" aria-hidden="true">⌁</span>
              <span className="bill-details"><strong>{vehicle.name}</strong><span>{vehicleDetails(vehicle)} · {entries.length} service {entries.length === 1 ? "record" : "records"}</span></span>
              <span className="totals-chevron" aria-hidden="true">{expanded ? "⌄" : "›"}</span>
            </button>
            {expanded && <div className="cars-vehicle-panel">
              <section className="cars-history-card" aria-label="Maintenance history">
                <div className="cars-history-heading"><h3>Maintenance history</h3><span>{entries.length}</span></div>
                {entries.length ? <ul className="cars-history-list">{entries.map((entry) => <li key={entry.id}>
                  <span className="bill-details"><strong>{entry.description}</strong><span>{displayDate(entry.service_date)}{entry.mileage !== null ? ` · ${entry.mileage.toLocaleString()} mi` : ""}</span></span>
                  {entry.cost !== null && <strong className="bill-amount">{money(entry.cost)}</strong>}
                </li>)}</ul> : <p className="cars-no-history">No maintenance records yet.</p>}
              </section>
              <form className="cars-maintenance-form totals-form" onSubmit={(event) => createMaintenance(event, vehicle.id)}>
                <h3>Add a service record</h3>
                <label htmlFor={`service-description-${vehicle.id}`}>Description</label>
                <input id={`service-description-${vehicle.id}`} name="description" required maxLength={160} placeholder="Oil change, new tires…" />
                <div className="cars-entry-grid cars-service-fields">
                  <div><label htmlFor={`service-date-${vehicle.id}`}>Date</label><input id={`service-date-${vehicle.id}`} name="service-date" type="date" required value={maintenanceDate} onChange={(event) => setMaintenanceDate(event.target.value)} /></div>
                  <div><label htmlFor={`service-cost-${vehicle.id}`}>Cost</label><div className="cars-cost-input"><span aria-hidden="true">$</span><input id={`service-cost-${vehicle.id}`} name="cost" type="number" min="0" max="99999999.99" step="0.01" placeholder="0.00" /></div></div>
                  <div><label htmlFor={`service-mileage-${vehicle.id}`}>Mileage</label><input id={`service-mileage-${vehicle.id}`} name="mileage" required type="number" min="0" max="2147483647" step="1" placeholder="Miles" /></div>
                </div>
                <button type="submit" className="totals-primary-button" disabled={savingMaintenance}>{savingMaintenance ? "Saving…" : "Add maintenance"}</button>
              </form>
            </div>}
          </li>;
        })}</ul> : <p className="monthly-empty">Add a vehicle to start tracking its maintenance.</p>}
        <button type="button" className="totals-add-account" onClick={() => { setShowAdd((current) => !current); setError(null); }}>{showAdd ? "Cancel" : "+ Add vehicle"}</button>
        {showAdd && <form className="totals-form cars-add-form" onSubmit={createVehicle}>
          <label htmlFor="vehicle-name">Vehicle name</label><input id="vehicle-name" name="name" required maxLength={80} placeholder="Family car, Work truck…" />
          <div className="totals-form-grid"><div><label htmlFor="vehicle-year">Year</label><input id="vehicle-year" name="year" type="number" min="1886" max={new Date().getFullYear() + 1} step="1" placeholder="(Optional)" /></div><div><label htmlFor="vehicle-make">Make</label><input id="vehicle-make" name="make" maxLength={60} placeholder="(Optional)" /></div></div>
          <label htmlFor="vehicle-model">Model</label><input id="vehicle-model" name="model" maxLength={60} placeholder="(Optional)" />
          <button type="submit" className="totals-primary-button" disabled={savingVehicle}>{savingVehicle ? "Saving…" : "Add vehicle"}</button>
        </form>}
      </section>
      {error && <p className="monthly-error" role="alert">{error}</p>}
    </section>
  );
}
