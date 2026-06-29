import type { HealthIssue, PlantAnalysis, Severity } from "../types";

const SEVERITY_COLORS: Record<Severity, string> = {
  none: "#2e9e5b",
  low: "#7cb342",
  moderate: "#f5a623",
  high: "#ef6c00",
  critical: "#d32f2f",
};

const ISSUE_ICONS: Record<HealthIssue["type"], string> = {
  disease: "🦠",
  pest: "🐛",
  deficiency: "🧪",
  environmental: "🌡️",
};

function healthColor(score: number): string {
  if (score >= 80) return "#2e9e5b";
  if (score >= 60) return "#7cb342";
  if (score >= 40) return "#f5a623";
  return "#d32f2f";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function HealthRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = healthColor(score);
  return (
    <svg className="ring" width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={radius} stroke="#e6efe9" strokeWidth="12" fill="none" />
      <circle
        cx="65"
        cy="65"
        r={radius}
        stroke={color}
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 65 65)"
      />
      <text x="65" y="60" textAnchor="middle" className="ring-score" fill={color}>
        {score}
      </text>
      <text x="65" y="82" textAnchor="middle" className="ring-label">
        / 100
      </text>
    </svg>
  );
}

function CareTile({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="care-tile">
      <div className="ct-head">
        <span className="ct-icon">{icon}</span>
        <h4>{title}</h4>
      </div>
      <div className="ct-body">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p className="kv">
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </p>
  );
}

export function AnalysisResult({ result }: { result: PlantAnalysis }) {
  const { identification: id, health, care, climateFit } = result;

  return (
    <div className="results">
      {result.source === "demo" && (
        <div className="demo-note">
          Demo mode — sample analysis. Add an <code>OPENAI_API_KEY</code> on the server
          for real AI photo identification.
        </div>
      )}

      {/* Identification */}
      <section className="card id-card">
        <div className="id-main">
          <h2>{id.commonName}</h2>
          <p className="latin">{id.scientificName}</p>
          <p className="family">Family: {id.family}</p>
          <p className="desc">{id.description}</p>
        </div>
        <div className="confidence">
          <div className="conf-badge">{Math.round(id.confidence * 100)}%</div>
          <span>match confidence</span>
        </div>
        {id.alternativeMatches?.length > 0 && (
          <div className="alts">
            <span className="alts-label">Could also be:</span>
            {id.alternativeMatches.map((a) => (
              <span key={a.scientificName} className="alt-chip">
                {a.commonName} <em>({Math.round(a.confidence * 100)}%)</em>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Health */}
      <section className="card health-card">
        <div className="health-top">
          <HealthRing score={health.score} />
          <div className="health-summary">
            <span
              className="status-pill"
              style={{ background: healthColor(health.score) }}
            >
              {health.status}
            </span>
            <p>{health.summary}</p>
          </div>
        </div>
        {health.issues?.length > 0 && (
          <div className="issues">
            <h3>Observations &amp; issues</h3>
            {health.issues.map((issue, i) => (
              <div key={i} className="issue">
                <div className="issue-head">
                  <span className="issue-icon">{ISSUE_ICONS[issue.type]}</span>
                  <strong>{issue.name}</strong>
                  <span
                    className="sev"
                    style={{ color: SEVERITY_COLORS[issue.severity] }}
                  >
                    {issue.severity}
                  </span>
                </div>
                <p className="issue-desc">{issue.description}</p>
                <p className="issue-fix">
                  <strong>Treatment:</strong> {issue.treatment}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Climate fit */}
      <section className={`card climate-fit fit-${climateFit.rating}`}>
        <h3>
          {climateFit.suitable ? "✅" : "⚠️"} Climate &amp; location fit —{" "}
          <span className="cap">{climateFit.rating}</span>
        </h3>
        <p>{climateFit.notes}</p>
      </section>

      {/* Care plan */}
      <h3 className="section-title">Your care plan</h3>
      <div className="care-grid">
        <CareTile icon="💧" title="Watering">
          <div className="next-water">
            <span className="nw-label">Next watering</span>
            <span className="nw-date">{formatDate(care.water.nextWateringDate)}</span>
            <span className="nw-freq">every {care.water.frequencyDays} days</span>
          </div>
          <Row label="Amount" value={care.water.amount} />
          <Row label="Method" value={care.water.method} />
          <Row label="Notes" value={care.water.notes} />
        </CareTile>

        <CareTile icon="☀️" title="Light & placement">
          <Row label="Needs" value={care.light.requirement} />
          <Row label="Where" value={care.light.placement} />
        </CareTile>

        <CareTile icon="🪴" title="Soil">
          <Row label="Type" value={care.soil.type} />
          <Row label="pH" value={care.soil.phRange} />
          <Row label="Drainage" value={care.soil.drainage} />
          <Row label="Tip" value={care.soil.recommendation} />
        </CareTile>

        <CareTile icon="🏺" title="Pot">
          <Row label="Assessment" value={care.pot.assessment} />
          <Row label="Size" value={care.pot.recommendedSize} />
          <Row label="Material" value={care.pot.material} />
          <Row label="Drainage" value={care.pot.drainage} />
        </CareTile>

        <CareTile icon="🔄" title="Repotting">
          <Row label="Needed now?" value={care.repot.needed ? "Yes" : "Not yet"} />
          <Row label="Frequency" value={care.repot.frequency} />
          <Row label="Best season" value={care.repot.bestSeason} />
          <Row label="How" value={care.repot.instructions} />
        </CareTile>

        <CareTile icon="🌱" title="Fertilizer">
          <Row label="Type" value={care.fertilizer.type} />
          <Row label="N-P-K" value={care.fertilizer.npk} />
          <Row label="Frequency" value={care.fertilizer.frequency} />
          <Row label="Season" value={care.fertilizer.season} />
          <Row label="Notes" value={care.fertilizer.notes} />
        </CareTile>

        <CareTile icon="🌡️" title="Temperature">
          <Row label="Ideal" value={`${care.temperature.idealC}°C`} />
          <Row
            label="Range"
            value={`${care.temperature.minC}°C – ${care.temperature.maxC}°C`}
          />
        </CareTile>

        <CareTile icon="💨" title="Humidity">
          <Row label="Ideal" value={care.humidity.idealPct} />
          <Row label="Tips" value={care.humidity.tips} />
        </CareTile>
      </div>

      {/* Growth + pest prevention */}
      <div className="lists-grid">
        <section className="card list-card">
          <h3>📈 Grow tall &amp; healthy</h3>
          <ul>
            {result.growthTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="card list-card">
          <h3>🛡️ Pest &amp; insect prevention</h3>
          <ul>
            {result.pestPrevention.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      </div>

      <p className="analyzed-at">
        Analyzed {new Date(result.analyzedAt).toLocaleString()} ·{" "}
        {result.source === "ai" ? "AI vision" : "Demo"} mode
      </p>
    </div>
  );
}
