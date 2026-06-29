import type { ClimateContext } from "../types";

export function ClimateBanner({ climate }: { climate: ClimateContext }) {
  const place =
    climate.locationName ??
    `${climate.latitude.toFixed(2)}, ${climate.longitude.toFixed(2)}`;

  return (
    <div className="climate-banner">
      <span className="cb-icon">🌍</span>
      <div className="cb-text">
        <strong>Local climate</strong>
        <span>
          {place}
          {climate.currentTempC !== undefined && ` · ${Math.round(climate.currentTempC)}°C`}
          {climate.humidityPct !== undefined && ` · ${Math.round(climate.humidityPct)}% humidity`}
          {climate.conditions && ` · ${climate.conditions}`}
        </span>
      </div>
    </div>
  );
}
