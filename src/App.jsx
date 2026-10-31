import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  Clock3,
  Crosshair,
  Filter,
  LocateFixed,
  Map,
  MapPin,
  Menu,
  Minus,
  Navigation,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { isAthensWideSearch, matchesSearch } from "./search.js";
import { getAvailableSpaces, parkingSpots } from "./parkingData.js";

function MapZoomControls() {
  const map = useMap();

  return (
    <div className="leaflet-top leaflet-right map-controls">
      <div className="leaflet-control map-zoom-controls">
        <button
          aria-label="Μεγέθυνση χάρτη"
          onClick={() => map.zoomIn()}
          type="button"
        >
          <Plus size={14} />
        </button>
        <span />
        <button
          aria-label="Σμίκρυνση χάρτη"
          onClick={() => map.zoomOut()}
          type="button"
        >
          <Minus size={14} />
        </button>
      </div>
    </div>
  );
}

function FitParkingSpots({ spots }) {
  const map = useMap();
  const previousSpots = useRef(null);

  useEffect(() => {
    if (previousSpots.current === spots) return;
    previousSpots.current = spots;
    if (spots.length === 0) return;
    if (spots.length === 1) {
      map.setView([spots[0].latitude, spots[0].longitude], 15);
      return;
    }
    map.fitBounds(
      spots.map((spot) => [spot.latitude, spot.longitude]),
      { padding: [36, 36], maxZoom: 14 },
    );
  }, [map, spots]);

  return null;
}

function App() {
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [arrivalMode, setArrivalMode] = useState("now");
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [view, setView] = useState("map");
  const [selectedSpot, setSelectedSpot] = useState("1-1");
  const [savedSpots, setSavedSpots] = useState([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [parkingType, setParkingType] = useState("Όλα");
  const [sortByDistance, setSortByDistance] = useState(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authUser, setAuthUser] = useState(() => {
    const email = window.localStorage.getItem("parkly-demo-session-email");
    if (!email) return null;
    return {
      email,
      name: window.localStorage.getItem("parkly-demo-session-name") || email,
    };
  });

  const isFuture = arrivalMode === "future";
  const filteredSpots = useMemo(() => {
    const allCentralAreas = isAthensWideSearch(destination);
    return parkingSpots.filter((spot) => {
      const matchesDestination =
        !destination.trim() ||
        allCentralAreas ||
        matchesSearch(destination, spot);
      return favoritesOnly
        ? savedSpots.includes(spot.id)
        : matchesDestination &&
            (parkingType === "Όλα" || spot.type === parkingType);
    });
  }, [destination, favoritesOnly, parkingType, savedSpots]);

  const spots = useMemo(() => {
    return [...filteredSpots].sort((a, b) =>
      sortByDistance
        ? Number.parseFloat(a.distance.replace(",", ".")) -
          Number.parseFloat(b.distance.replace(",", "."))
        : getAvailableSpaces(b, isFuture, selectedTime) -
          getAvailableSpaces(a, isFuture, selectedTime),
    );
  }, [filteredSpots, isFuture, selectedTime, sortByDistance]);

  const totalAvailable = spots.reduce(
    (sum, spot) => sum + getAvailableSpaces(spot, isFuture, selectedTime),
    0,
  );

  function toggleFavoritesView() {
    setFavoritesOnly((showingFavorites) => !showingFavorites);
    setView("list");
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }

  function search(event) {
    event.preventDefault();
    const nextDestination = query.trim();
    setDestination(nextDestination);
    const matchingSpot = parkingSpots.find((spot) => matchesSearch(nextDestination, spot));
    setSelectedSpot(matchingSpot?.id ?? parkingSpots[0].id);
    setNotice(
      nextDestination
        ? `Εμφάνιση διαθέσιμων θέσεων για «${nextDestination}».`
        : "Εμφάνιση parking σε όλες τις περιοχές.",
    );
  }

  function announce(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  function toggleSaved(id) {
    setSavedSpots((current) =>
      current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id],
    );
  }

  function openAuth() {
    setAuthMode("signin");
    setAuthEmail(authUser?.email ?? "");
    setAuthName("");
    setAuthError("");
    setAuthOpen(true);
  }

  function submitDemoAuth(event) {
    event.preventDefault();
    const email = authEmail.trim().toLowerCase();
    const accountKey = `parkly-demo-account:${email}`;
    const storedName = window.localStorage.getItem(accountKey);

    if (authMode === "signup") {
      if (storedName !== null) {
        setAuthError("Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδέσου.");
        return;
      }

      const name = authName.trim();
      if (!name) {
        setAuthError("Συμπλήρωσε το ονοματεπώνυμό σου.");
        return;
      }
      window.localStorage.setItem(accountKey, name);
      window.localStorage.setItem("parkly-demo-session-email", email);
      window.localStorage.setItem("parkly-demo-session-name", name);
      setAuthUser({ email, name });
      setAuthOpen(false);
      announce(`Ο demo λογαριασμός δημιουργήθηκε για το ${email}.`);
      return;
    }

    if (storedName === null) {
      setAuthError("Δεν βρέθηκε λογαριασμός με αυτό το email. Δημιούργησε λογαριασμό.");
      return;
    }

    const name = storedName || email;
    window.localStorage.setItem("parkly-demo-session-email", email);
    window.localStorage.setItem("parkly-demo-session-name", name);
    setAuthUser({ email, name });
    setAuthOpen(false);
    announce(`Συνδέθηκες ως ${email}.`);
  }

  function signOut() {
    window.localStorage.removeItem("parkly-demo-session-email");
    window.localStorage.removeItem("parkly-demo-session-name");
    setAuthUser(null);
    announce("Αποσυνδέθηκες από τον demo λογαριασμό.");
  }

  useEffect(() => {
    if (!howItWorksOpen && !authOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setHowItWorksOpen(false);
        setAuthOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [authOpen, howItWorksOpen]);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20211f]">
      <header className="relative z-20 border-b border-[#eaeae6] bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a className="flex items-center gap-2.5" href="#" aria-label="Parkly αρχική">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#20211f] text-[#e2bd78]">
              <Navigation size={19} strokeWidth={2.2} />
            </span>
            <span className="text-[20px] font-semibold tracking-[-0.8px]">
              parkly<span className="text-[#c59b4f]">.</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-[13px] font-medium text-[#686963] md:flex">
            <a className="text-[#252621]" href="#results">Εξερεύνηση</a>
            <button
              aria-pressed={favoritesOnly}
              className={`transition-colors hover:text-[#bd9141] ${favoritesOnly ? "text-[#a47b35]" : ""}`}
              onClick={toggleFavoritesView}
            >
              {favoritesOnly ? "Όλα τα parking" : `Τα αγαπημένα μου${savedSpots.length ? ` (${savedSpots.length})` : ""}`}
            </button>
            <button
              className="transition-colors hover:text-[#bd9141]"
              onClick={() => setHowItWorksOpen(true)}
            >
              Πώς λειτουργεί
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 rounded-full border border-[#e8e7e2] px-3 py-2 text-[11px] font-medium transition hover:border-[#c5a15e] sm:px-4 sm:text-[12px]"
              onClick={authUser ? signOut : openAuth}
            >
              <Users size={15} /> {authUser ? "Αποσύνδεση" : "Σύνδεση"}
            </button>
            <button
              aria-label={favoritesOnly ? "Εμφάνιση όλων των parking" : "Τα αγαπημένα μου"}
              aria-pressed={favoritesOnly}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e7e2] text-[#55564f] sm:hidden"
              onClick={toggleFavoritesView}
            >
              <Bookmark size={16} fill={favoritesOnly ? "currentColor" : "none"} />
            </button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#eee8dc] text-xs font-semibold text-[#82652e] sm:flex">
              {authUser ? (authUser.name[0] || authUser.email[0]).toLocaleUpperCase("el") : "Α"}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-10 pt-8 sm:px-8 sm:pt-10 lg:px-12">
        <div className="mb-7">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-[1.4px] text-[#92928b]">
            <span>ΑΘΗΝΑ</span><span className="text-[#d0cfc8]">/</span><span>ΕΞΥΠΝΟ PARKING</span>
          </div>
          <h1 className="text-[29px] font-semibold leading-tight tracking-[-1.3px] sm:text-[36px]">
            Βρες τη θέση σου<span className="text-[#c59b4f]">.</span>
          </h1>
          <p className="mt-2 text-[13px] text-[#85867f] sm:text-[14px]">
            Το parking στην πόλη, λίγο πιο απλό.
          </p>
        </div>

        <section
          aria-label="Αναζήτηση parking"
          className="mb-6 grid gap-3 rounded-2xl border border-[#eeede9] bg-white p-3 shadow-[0_5px_22px_rgba(27,27,24,0.035)] sm:grid-cols-[minmax(230px,1fr)_auto_auto] sm:items-center sm:p-3"
        >
          <form onSubmit={search} className="flex min-w-0 items-center gap-3 px-2 sm:px-3">
            <MapPin className="shrink-0 text-[#bd9141]" size={19} />
            <label className="min-w-0 flex-1">
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-[1px] text-[#a2a29b]">
                Προορισμός
              </span>
              <input
                aria-label="Περιοχή προορισμού"
                className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-[#b4b4ae]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Π.χ. Σύνταγμα ή Syntagma"
                value={query}
              />
            </label>
            <button
              aria-label="Αναζήτηση"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#20211f] text-[#e5c27e] transition hover:bg-[#353630] sm:hidden"
              type="submit"
            >
              <Search size={17} />
            </button>
          </form>

          <div className="flex items-center gap-3 border-t border-[#f0efec] px-2 pt-3 sm:border-l sm:border-t-0 sm:px-5 sm:pt-0">
            <Clock3 size={18} className="shrink-0 text-[#888981]" />
            <div className="min-w-[155px] flex-1">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-[1px] text-[#a2a29b]">
                Ώρα άφιξης
              </span>
              <div className="flex items-center gap-1">
                <button
                  aria-pressed={!isFuture}
                  className={`rounded-md px-2 py-1 text-[12px] transition ${!isFuture ? "bg-[#f3f0e9] font-semibold text-[#715827]" : "text-[#82837d] hover:bg-[#f7f6f3]"}`}
                  onClick={() => setArrivalMode("now")}
                >
                  Τώρα
                </button>
                <button
                  aria-pressed={isFuture}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[12px] transition ${isFuture ? "bg-[#f3f0e9] font-semibold text-[#715827]" : "text-[#82837d] hover:bg-[#f7f6f3]"}`}
                  onClick={() => setArrivalMode("future")}
                >
                  <CalendarDays size={13} /> Μελλοντική
                </button>
                {isFuture && (
                  <div className="ml-auto flex items-center gap-1">
                    <label>
                      <span className="sr-only">Ώρα άφιξης, από 0 έως 23</span>
                      <select
                        aria-label="Ώρα άφιξης, από 0 έως 23"
                        className="rounded-md border border-[#e9e3d6] bg-[#fcfaf6] px-1.5 py-1 text-[12px] font-semibold text-[#765b29] outline-none focus:border-[#c8a35d]"
                        onChange={(event) =>
                          setSelectedTime(`${event.target.value}:${selectedTime.slice(3)}`)
                        }
                        value={selectedTime.slice(0, 2)}
                      >
                        {Array.from({ length: 24 }, (_, hour) => {
                          const value = String(hour).padStart(2, "0");
                          return <option key={value} value={value}>{value}</option>;
                        })}
                      </select>
                    </label>
                    <span aria-hidden="true" className="text-[12px] font-semibold text-[#765b29]">:</span>
                    <label>
                      <span className="sr-only">Λεπτά άφιξης</span>
                      <select
                        aria-label="Λεπτά άφιξης"
                        className="rounded-md border border-[#e9e3d6] bg-[#fcfaf6] px-1.5 py-1 text-[12px] font-semibold text-[#765b29] outline-none focus:border-[#c8a35d]"
                        onChange={(event) =>
                          setSelectedTime(`${selectedTime.slice(0, 2)}:${event.target.value}`)
                        }
                        value={selectedTime.slice(3)}
                      >
                        {Array.from({ length: 60 }, (_, minute) => {
                          const value = String(minute).padStart(2, "0");
                          return <option key={value} value={value}>{value}</option>;
                        })}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            className="hidden h-[46px] items-center justify-center gap-2 rounded-xl bg-[#20211f] px-6 text-[13px] font-semibold text-white transition hover:bg-[#353630] sm:flex"
            onClick={search}
            type="button"
          >
            <Search size={16} className="text-[#e1bd79]" /> Αναζήτηση
          </button>
        </section>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3" id="results">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-semibold tracking-[-0.4px]">
                {favoritesOnly ? "Τα αγαπημένα μου" : "Κοντινές θέσεις"}
              </h2>
              <span className="rounded-full bg-[#eeede9] px-2 py-0.5 text-[10px] font-medium text-[#777870]">
                {spots.length} σημεία
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#8c8d86]">
              {destination || "Όλες οι περιοχές"} · {isFuture ? `Άφιξη στις ${selectedTime}` : "Άφιξη τώρα"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-[#e9e8e3] bg-white p-1">
              <button
                aria-label="Προβολή χάρτη"
                aria-pressed={view === "map"}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${view === "map" ? "bg-[#20211f] text-white" : "text-[#777870] hover:bg-[#f4f3f0]"}`}
                onClick={() => setView("map")}
              >
                <Map size={14} /> Χάρτης
              </button>
              <button
                aria-label="Προβολή λίστας"
                aria-pressed={view === "list"}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${view === "list" ? "bg-[#20211f] text-white" : "text-[#777870] hover:bg-[#f4f3f0]"}`}
                onClick={() => setView("list")}
              >
                <Menu size={14} /> Λίστα
              </button>
            </div>
            <div className="relative">
              <button
                aria-expanded={filterOpen}
                className={`flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition ${filterOpen ? "border-[#c9a45f] bg-[#fbf8f2] text-[#765b29]" : "border-[#e9e8e3] bg-white text-[#777870] hover:border-[#cfbd97]"}`}
                onClick={() => setFilterOpen((open) => !open)}
              >
                <Filter size={13} /> Φίλτρα
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-[42px] z-30 w-56 rounded-xl border border-[#eeede9] bg-white p-4 shadow-xl">
                  <p className="mb-3 text-[12px] font-semibold">Ταξινόμηση & φίλτρα</p>
                  <label className="mb-3 block text-[11px] text-[#696a64]">
                    <span className="mb-1.5 block">Τύπος parking</span>
                    <select
                      aria-label="Φίλτρο τύπου parking"
                      className="w-full rounded-md border border-[#e9e8e3] bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[#c8a35d]"
                      onChange={(event) => setParkingType(event.target.value)}
                      value={parkingType}
                    >
                      <option value="Όλα">Όλα τα parking</option>
                      <option value="Ιδιωτικό">Ιδιωτικό</option>
                      <option value="Δημόσιο">Δημόσιο</option>
                    </select>
                  </label>
                  <button
                    className="flex w-full items-center justify-between border-t border-[#f1f0ed] pt-3 text-left text-[11px] text-[#696a64]"
                    onClick={() => setSortByDistance((byDistance) => !byDistance)}
                  >
                    <span>Ταξινόμηση: {sortByDistance ? "Απόσταση" : "Διαθεσιμότητα"}</span>
                    <ArrowDownUp size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isFuture && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadbbd] bg-[#fcfaf5] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f1e5cc] text-[#a87c31]">
                <Sparkles size={15} />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-[#6c5428]">Προβλεπόμενη διαθεσιμότητα</p>
                <p className="text-[10px] text-[#9a8868]">Ενδεικτικά στοιχεία mockup για τις {selectedTime}</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-[#856a39]">
              {totalAvailable} θέσεις εκτιμώμενες συνολικά
            </span>
          </div>
        )}

        <section
          aria-label={view === "map" ? "Χάρτης και αποτελέσματα" : "Λίστα αποτελεσμάτων"}
          className={`grid gap-4 ${view === "map" ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(370px,0.92fr)]" : "grid-cols-1"}`}
        >
          {view === "map" && (
            <div className="map-surface relative h-[420px] overflow-hidden rounded-2xl border border-[#e9e8e3] bg-[#e9ede5] sm:h-[490px]">
              <MapContainer
                aria-label={`Διαδραστικός χάρτης της Αθήνας με ${spots.length} parking`}
                center={[37.978, 23.734]}
                className="absolute inset-0 z-0"
                scrollWheelZoom
                zoom={12}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <FitParkingSpots spots={filteredSpots} />
                <MarkerClusterGroup
                  iconCreateFunction={(cluster) =>
                    divIcon({
                      className: "area-cluster-icon",
                      html: `<span class="area-cluster-count">${cluster.getChildCount()}</span>`,
                      iconSize: [42, 42],
                      iconAnchor: [21, 21],
                    })
                  }
                  maxClusterRadius={40}
                  showCoverageOnHover={false}
                >
                  {spots.map((spot) => {
                    const available = getAvailableSpaces(
                      spot,
                      isFuture,
                      selectedTime,
                    );
                    const selected = spot.id === selectedSpot;
                    const icon = divIcon({
                      className: "parking-map-icon",
                      html: `<span class="parking-map-pin${selected ? " is-selected" : ""}${isFuture ? " is-future" : ""}">${available}</span>`,
                      iconSize: [36, 36],
                      iconAnchor: [18, 18],
                    });

                    return (
                      <Marker
                        key={spot.id}
                        alt={`${spot.area}: ${available} ενδεικτικά διαθέσιμες θέσεις`}
                        eventHandlers={{ click: () => setSelectedSpot(spot.id) }}
                        icon={icon}
                        position={[spot.latitude, spot.longitude]}
                        title={`${spot.area}: ${available} διαθέσιμες θέσεις`}
                      >
                        <Tooltip direction="top" offset={[0, -16]}>
                          {spot.area}: {available} θέσεις (ενδεικτικά)
                        </Tooltip>
                      </Marker>
                    );
                  })}
                </MarkerClusterGroup>
                <MapZoomControls />
              </MapContainer>

              <button
                aria-label="Εστίαση στην τοποθεσία μου"
                className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[#eae9e4] bg-white text-[#5b5c55] shadow-sm transition hover:text-[#bd9141]"
                onClick={() => announce("Δεν απαιτείται τοποθεσία για την προεπισκόπηση του χάρτη.")}
              >
                <LocateFixed size={16} />
              </button>
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-[10px] font-medium text-[#66675f] shadow-sm backdrop-blur">
                <Crosshair size={13} className="text-[#bd9141]" />
                <span>Αθήνα · {spots.length} parking</span>
              </div>
              <div className="absolute bottom-4 left-4 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-[10px] text-[#777870] shadow-sm backdrop-blur">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#b79c67]" />
                Ενδεικτικές θέσεις
              </div>
            </div>
          )}

          <div className={`flex flex-col gap-3 ${view === "list" ? "md:grid md:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {spots.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#deddd7] bg-white px-6 text-center">
                {favoritesOnly && savedSpots.length === 0
                  ? <Bookmark size={22} className="mb-3 text-[#bd9141]" />
                  : <MapPin size={22} className="mb-3 text-[#bd9141]" />}
                <p className="text-[14px] font-semibold">
                  {favoritesOnly && savedSpots.length === 0
                    ? "Δεν έχεις προσθέσει αγαπημένα"
                    : "Δεν βρέθηκαν θέσεις"}
                </p>
                <p className="mt-1 text-[12px] text-[#8a8b84]">
                  {favoritesOnly && savedSpots.length === 0
                    ? "Πάτησε το εικονίδιο σε ένα parking για να το αποθηκεύσεις εδώ."
                    : "Δοκίμασε μια διαφορετική περιοχή ή αφαίρεσε τα φίλτρα."}
                </p>
                <button className="mt-4 text-[12px] font-semibold text-[#9a7737] underline underline-offset-4" onClick={() => {
                  if (favoritesOnly) {
                    setFavoritesOnly(false);
                  } else {
                    setParkingType("Όλα");
                    setQuery("");
                    setDestination("");
                  }
                }}>
                  {favoritesOnly ? "Εμφάνιση όλων των parking" : "Επαναφορά αναζήτησης"}
                </button>
              </div>
            ) : spots.map((spot) => {
              const available = getAvailableSpaces(spot, isFuture, selectedTime);
              const isSelected = selectedSpot === spot.id;
              const saved = savedSpots.includes(spot.id);
              return (
                <article
                  key={spot.id}
                  className={`rounded-2xl border bg-white p-4 transition sm:p-[18px] ${isSelected ? "border-[#d8c49e] shadow-[0_5px_20px_rgba(80,63,29,0.07)]" : "border-[#eeede9] hover:border-[#ded8ca]"}`}
                  onClick={() => setSelectedSpot(spot.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#f3f2ef] px-2 py-1 text-[9px] font-medium text-[#72736d]">{spot.type}</span>
                        {isFuture && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#e9d8b7] bg-[#fcfaf5] px-2 py-1 text-[9px] font-semibold text-[#8a6c34]">
                            <Sparkles size={10} /> Πρόβλεψη
                          </span>
                        )}
                      </div>
                      <h3 className="truncate text-[14px] font-semibold tracking-[-0.2px]">{spot.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-[#90918a]">
                        <MapPin size={11} /> {spot.address}
                      </p>
                    </div>
                    <button
                      aria-label={saved ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${saved ? "bg-[#f8f1e4] text-[#a47b35]" : "text-[#9b9c95] hover:bg-[#f6f5f2] hover:text-[#a47b35]"}`}
                      onClick={(event) => { event.stopPropagation(); toggleSaved(spot.id); }}
                    >
                      <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="my-3.5 h-px bg-[#f0efec]" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className={`text-[21px] font-semibold leading-none tracking-[-0.8px] ${isFuture ? "text-[#a47b35]" : ""}`}>{available}</p>
                        <p className="mt-1 text-[9px] text-[#888981]">ελεύθερες θέσεις</p>
                      </div>
                      <div className="h-7 w-px bg-[#eeede9]" />
                      <div>
                        <p className="text-[12px] font-semibold">{spot.total}</p>
                        <p className="mt-1 text-[9px] text-[#888981]">συνολικές</p>
                      </div>
                      <div className="h-7 w-px bg-[#eeede9]" />
                      <div>
                        <p className="text-[12px] font-semibold">{spot.distance}</p>
                        <p className="mt-1 text-[9px] text-[#888981]">από Σύνταγμα</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-semibold">{spot.price}</p>
                      <p className="mt-1 text-[9px] text-[#888981]">ανά ώρα</p>
                    </div>
                  </div>

                  {isFuture && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-[#faf8f3] px-2.5 py-2">
                      <span className="flex items-center gap-1.5 text-[9px] text-[#837251]"><Sparkles size={11} /> Πρόβλεψη για {selectedTime}</span>
                      <span className="text-[9px] font-semibold text-[#80632d]">{available}/{spot.total} θέσεις</span>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#20211f] text-[10px] font-semibold text-white transition hover:bg-[#353630]"
                      onClick={(event) => { event.stopPropagation(); announce(`Άνοιγμα οδηγιών για ${spot.name}.`); }}
                    >
                      Οδηγίες <ArrowUpRight size={13} className="text-[#e2bd78]" />
                    </button>
                    <button
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e9e8e3] text-[10px] font-semibold text-[#55564f] transition hover:border-[#cfbd97] hover:bg-[#fcfaf5]"
                      onClick={(event) => { event.stopPropagation(); announce(`Η θέση στο ${spot.name} προστέθηκε στη διαδρομή σου.`); }}
                    >
                      Κράτηση <ArrowRight size={13} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-[#999a93]">
          <Sparkles size={12} className="text-[#bd9141]" />
          {isFuture
            ? "Οι προβλέψεις και οι διαθέσιμες θέσεις είναι ενδεικτικά δεδομένα mockup, όχι ζωντανή ενημέρωση."
            : "Οι διαθέσιμες θέσεις είναι ενδεικτικά δεδομένα mockup, όχι ζωντανή ενημέρωση."}
        </div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#eae9e4] pt-5 text-[10px] text-[#999a93] sm:flex-row">
          <span>© 2025 parkly. Σχεδιασμένο για την πόλη.</span>
          <div className="flex gap-5">
            <button onClick={() => announce("Πολιτική απορρήτου — διαθέσιμη σύντομα.")}>Απόρρητο</button>
            <button onClick={() => announce("Χρειάζεσαι βοήθεια; Η υποστήριξη είναι διαθέσιμη σύντομα.")}>Βοήθεια</button>
          </div>
        </footer>
      </main>

      {howItWorksOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#20211f]/40 p-4"
          onClick={() => setHowItWorksOpen(false)}
        >
          <section
            aria-labelledby="how-it-works-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#bd9141]">
                  parkly.
                </p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.5px]" id="how-it-works-title">
                  Πώς λειτουργεί η εφαρμογή
                </h2>
              </div>
              <button
                aria-label="Κλείσιμο"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#777870] hover:bg-[#f4f3f0]"
                onClick={() => setHowItWorksOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <ol className="mt-5 space-y-4 text-[13px] leading-relaxed text-[#686963]">
              <li><span className="mr-2 font-semibold text-[#a47b35]">1.</span>Γράψε την περιοχή ή τον προορισμό σου στην αναζήτηση.</li>
              <li><span className="mr-2 font-semibold text-[#a47b35]">2.</span>Δες τα κοντινά parking στον χάρτη ή στη λίστα και σύγκρινε τις διαθέσιμες θέσεις.</li>
              <li><span className="mr-2 font-semibold text-[#a47b35]">3.</span>Για μελλοντική άφιξη, επίλεξε ώρα και δες την ενδεικτική πρόβλεψη.</li>
            </ol>
            <p className="mt-5 rounded-lg bg-[#fcfaf5] px-3 py-2 text-[11px] leading-relaxed text-[#8a7959]">
              Οι θέσεις και οι προβλέψεις είναι ενδεικτικά δεδομένα mockup, όχι ζωντανή ενημέρωση.
            </p>
            <button
              className="mt-5 w-full rounded-xl bg-[#20211f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#353630]"
              onClick={() => setHowItWorksOpen(false)}
            >
              Κατάλαβα
            </button>
          </section>
        </div>
      )}

      {authOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#20211f]/40 p-4"
          onClick={() => setAuthOpen(false)}
        >
          <section
            aria-labelledby="auth-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#bd9141]">
                  parkly.
                </p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.5px]" id="auth-title">
                  {authMode === "signup" ? "Δημιουργία λογαριασμού" : "Σύνδεση"}
                </h2>
              </div>
              <button
                aria-label="Κλείσιμο"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#777870] hover:bg-[#f4f3f0]"
                onClick={() => setAuthOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 rounded-lg bg-[#f4f3f0] p-1">
              <button
                aria-pressed={authMode === "signin"}
                className={`rounded-md px-3 py-2 text-[12px] font-medium ${authMode === "signin" ? "bg-white text-[#20211f] shadow-sm" : "text-[#777870]"}`}
                onClick={() => { setAuthMode("signin"); setAuthError(""); }}
                type="button"
              >
                Σύνδεση
              </button>
              <button
                aria-pressed={authMode === "signup"}
                className={`rounded-md px-3 py-2 text-[12px] font-medium ${authMode === "signup" ? "bg-white text-[#20211f] shadow-sm" : "text-[#777870]"}`}
                onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                type="button"
              >
                Δημιουργία λογαριασμού
              </button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={submitDemoAuth}>
              {authMode === "signup" && (
                <label className="block text-[12px] font-medium text-[#55564f]">
                  Ονοματεπώνυμο
                  <input
                    autoComplete="name"
                    className="mt-1.5 w-full rounded-lg border border-[#e9e8e3] px-3 py-2.5 text-[13px] outline-none focus:border-[#c8a35d]"
                    onChange={(event) => setAuthName(event.target.value)}
                    required
                    value={authName}
                  />
                </label>
              )}
              <label className="block text-[12px] font-medium text-[#55564f]">
                Email
                <input
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-lg border border-[#e9e8e3] px-3 py-2.5 text-[13px] outline-none focus:border-[#c8a35d]"
                  onChange={(event) => { setAuthEmail(event.target.value); setAuthError(""); }}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={authEmail}
                />
              </label>
              {authError && (
                <p className="text-[12px] text-red-700" role="alert">{authError}</p>
              )}
              <button
                className="w-full rounded-xl bg-[#20211f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#353630]"
                type="submit"
              >
                {authMode === "signup" ? "Δημιουργία λογαριασμού" : "Σύνδεση με email"}
              </button>
            </form>
            <p className="mt-4 rounded-lg bg-[#fcfaf5] px-3 py-2 text-[11px] leading-relaxed text-[#8a7959]">
              Demo mockup: δεν αποστέλλεται email και δεν γίνεται πραγματική επαλήθευση. Τα demo προφίλ αποθηκεύονται μόνο σε αυτό το πρόγραμμα περιήγησης.
            </p>
          </section>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-xl bg-[#252620] px-4 py-3 text-[12px] text-white shadow-xl" role="status">
          <Check size={15} className="shrink-0 text-[#e2bd78]" />
          <span>{notice}</span>
          <button aria-label="Κλείσιμο ειδοποίησης" className="ml-1 text-[#c2c2ba] hover:text-white" onClick={() => setNotice("")}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}

export default App;
