import { useEffect, useRef, useState } from "react";
import type { ClimateContext, PlantAnalysis, SavedPlant } from "./types";
import { analyzePhoto, fetchClimate, type LatLon } from "./api";
import { AnalysisResult } from "./components/AnalysisResult";
import { ClimateBanner } from "./components/ClimateBanner";
import { MyGarden } from "./components/MyGarden";
import { AccountBar } from "./components/AccountBar";
import { fetchCurrentUser, isLoggedIn, type User } from "./auth";
import {
  addToGarden,
  listGarden,
  migrateLocalToRemote,
  removeFromGarden,
  waterInGarden,
} from "./gardenStore";
import { loadGarden as loadLocalGarden } from "./garden";
import { createThumbnail } from "./util/image";
import {
  notificationPermission,
  notificationsSupported,
  notifyDuePlants,
  requestNotificationPermission,
} from "./notifications";
import { pushSupported, registerServiceWorker, subscribeToPush } from "./push";

type Status = "idle" | "locating" | "analyzing" | "done" | "error";
type NotifyState = NotificationPermission | "unsupported";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loc, setLoc] = useState<LatLon | null>(null);
  const [climate, setClimate] = useState<ClimateContext | null>(null);
  const [result, setResult] = useState<PlantAnalysis | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [plants, setPlants] = useState<SavedPlant[]>([]);
  const [notifyState, setNotifyState] = useState<NotifyState>("unsupported");
  const [nickname, setNickname] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshGarden() {
    try {
      setPlants(await listGarden());
    } catch {
      /* keep current list on transient errors */
    }
  }

  // Local (logged-out) in-app reminders only; logged-in users get background push.
  function runLocalReminders() {
    if (!isLoggedIn()) notifyDuePlants(loadLocalGarden());
  }

  // Bootstrap: restore session, register the service worker, load the garden.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      registerServiceWorker();
      const u = await fetchCurrentUser();
      if (cancelled) return;
      setUser(u);
      setNotifyState(notificationsSupported() ? notificationPermission() : "unsupported");
      await refreshGarden();
      runLocalReminders();
      // If the user already granted notifications and is logged in, keep the
      // push subscription fresh.
      if (u && pushSupported() && notificationPermission() === "granted") {
        subscribeToPush().catch(() => {});
      }
    })();

    const interval = window.setInterval(() => {
      refreshGarden();
      runLocalReminders();
    }, 30 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshGarden();
        runLocalReminders();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function handleAuthChanged(u: User | null) {
    setUser(u);
    if (u) {
      await migrateLocalToRemote();
      if (pushSupported() && notificationPermission() === "granted") {
        subscribeToPush().catch(() => {});
      }
    }
    await refreshGarden();
  }

  function onSelectFile(selected: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
    setSavedId(null);
    setNickname("");
    setStatus("idle");
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    onSelectFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) onSelectFile(dropped);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLoc(next);
        try {
          const c = await fetchClimate(next);
          setClimate(c);
        } catch {
          setClimate({ ...next });
        }
        setStatus("idle");
      },
      () => {
        setError("Couldn't access your location. Analysis will use general guidance.");
        setStatus("idle");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function runAnalysis() {
    if (!file) return;
    setStatus("analyzing");
    setError(null);
    setSavedId(null);
    try {
      const analysis = await analyzePhoto(file, loc ?? undefined);
      setResult(analysis);
      setNickname(analysis.identification.commonName);
      if (analysis.climate) setClimate(analysis.climate);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  async function handleSaveToGarden() {
    if (!result) return;
    const thumb = file ? await createThumbnail(file) : undefined;
    try {
      const updated = await addToGarden({
        nickname: nickname || result.identification.commonName,
        commonName: result.identification.commonName,
        scientificName: result.identification.scientificName,
        frequencyDays: result.care.water.frequencyDays,
        imageDataUrl: thumb,
        wateringNotes: result.care.water.notes,
      });
      setPlants(updated);
      setSavedId("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the plant.");
    }
  }

  async function handleWater(id: string) {
    setPlants(await waterInGarden(id));
  }

  async function handleRemove(id: string) {
    setPlants(await removeFromGarden(id));
  }

  async function enableNotifications() {
    if (isLoggedIn() && pushSupported()) {
      const ok = await subscribeToPush();
      setNotifyState(ok ? "granted" : notificationPermission());
    } else {
      const perm = await requestNotificationPermission();
      setNotifyState(perm);
      if (perm === "granted") runLocalReminders();
    }
  }

  function reset() {
    onSelectFile(null);
    setResult(null);
    setStatus("idle");
    setError(null);
    setSavedId(null);
  }

  const busy = status === "analyzing" || status === "locating";

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-top">
            <h1>
              <span className="leaf">🌿</span> PlantPal
            </h1>
            <AccountBar user={user} onAuthChanged={handleAuthChanged} />
          </div>
          <p>
            Snap a photo of your plant for instant identification, a health &amp; pest
            check, and a complete care plan tailored to your local climate — then save
            it to get watering reminders{user ? " on any device" : ""}.
          </p>
        </div>
      </header>

      <main className="container">
        {climate && <ClimateBanner climate={climate} />}

        <MyGarden
          plants={plants}
          notifyState={notifyState}
          loggedIn={!!user}
          onEnableNotifications={enableNotifications}
          onWater={handleWater}
          onRemove={handleRemove}
        />

        <section className="card uploader">
          <div
            className={`dropzone ${previewUrl ? "has-image" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Selected plant" className="preview" />
            ) : (
              <div className="dropzone-empty">
                <div className="big-icon">📷</div>
                <p className="dz-title">Tap to take or upload a photo</p>
                <p className="dz-sub">JPG or PNG, up to 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
              hidden
            />
          </div>

          <div className="controls">
            <button className="btn ghost" onClick={useMyLocation} disabled={busy}>
              {climate ? "📍 Update location" : "📍 Use my location"}
            </button>
            <button
              className="btn primary"
              onClick={runAnalysis}
              disabled={!file || busy}
            >
              {status === "analyzing" ? "Analyzing…" : "🔍 Analyze plant"}
            </button>
            {(file || result) && (
              <button className="btn ghost" onClick={reset} disabled={busy}>
                Reset
              </button>
            )}
          </div>

          {status === "locating" && <p className="hint">Getting your location…</p>}
          {!climate && status !== "locating" && (
            <p className="hint">
              Tip: add your location so watering, climate fit and care advice are
              tailored to where you live.
            </p>
          )}
          {error && <p className="error">{error}</p>}
        </section>

        {status === "analyzing" && (
          <section className="card loading">
            <div className="spinner" />
            <p>Inspecting leaves, identifying the species and building your care plan…</p>
          </section>
        )}

        {result && status === "done" && (
          <>
            <section className="card save-bar">
              {savedId ? (
                <p className="saved-msg">
                  ✅ Saved to <strong>My Garden</strong> — we'll remind you every{" "}
                  {result.care.water.frequencyDays} days
                  {user ? " across your devices." : "."}
                </p>
              ) : (
                <>
                  <div className="save-field">
                    <label htmlFor="nickname">Nickname</label>
                    <input
                      id="nickname"
                      type="text"
                      value={nickname}
                      placeholder={result.identification.commonName}
                      onChange={(e) => setNickname(e.target.value)}
                    />
                  </div>
                  <button className="btn primary" onClick={handleSaveToGarden}>
                    🪴 Save &amp; set watering reminder
                  </button>
                </>
              )}
            </section>
            <AnalysisResult result={result} />
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          PlantPal gives general horticultural guidance and is not a substitute for
          professional advice.
        </p>
      </footer>
    </div>
  );
}
