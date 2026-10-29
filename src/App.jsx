import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
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

const parkingSpots = [
  {
    id: 1,
    name: "Parking Πλατείας",
    address: "Πλατεία Συντάγματος, Αθήνα",
    distance: "0,3 km",
    total: 42,
    current: 8,
    predictions: { "19:00": 14, "20:00": 21, "21:00": 27 },
    price: "€2,50",
    type: "Ιδιωτικό",
    x: "48%",
    y: "40%",
  },
  {
    id: 2,
    name: "Θέσεις Ερμού",
    address: "Οδός Ερμού 18, Αθήνα",
    distance: "0,5 km",
    total: 26,
    current: 3,
    predictions: { "19:00": 9, "20:00": 15, "21:00": 18 },
    price: "€1,80",
    type: "Στον δρόμο",
    x: "64%",
    y: "57%",
  },
  {
    id: 3,
    name: "Parking Μοναστηράκι",
    address: "Πλατεία Μοναστηρακίου",
    distance: "0,8 km",
    total: 58,
    current: 12,
    predictions: { "19:00": 19, "20:00": 25, "21:00": 31 },
    price: "€2,00",
    type: "Ιδιωτικό",
    x: "32%",
    y: "66%",
  },
  {
    id: 4,
    name: "Θέσεις Κολωνακίου",
    address: "Οδός Σκουφά, Κολωνάκι",
    distance: "1,1 km",
    total: 18,
    current: 2,
    predictions: { "19:00": 5, "20:00": 8, "21:00": 11 },
    price: "€1,50",
    type: "Στον δρόμο",
    x: "70%",
    y: "27%",
  },
];

const timeOptions = ["19:00", "20:00", "21:00"];

function App() {
  const [query, setQuery] = useState("Κέντρο Αθήνας");
  const [destination, setDestination] = useState("Κέντρο Αθήνας");
  const [arrivalMode, setArrivalMode] = useState("now");
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [view, setView] = useState("map");
  const [selectedSpot, setSelectedSpot] = useState(1);
  const [savedSpots, setSavedSpots] = useState([]);
  const [notice, setNotice] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [privateOnly, setPrivateOnly] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(true);

  const isFuture = arrivalMode === "future";
  const spots = useMemo(() => {
    const filtered = parkingSpots.filter((spot) => {
      const matchesDestination =
        !destination.trim() ||
        /αθήν|athen|κέντρο|center/i.test(destination) ||
        spot.address.toLocaleLowerCase("el").includes(destination.toLocaleLowerCase("el")) ||
        spot.name.toLocaleLowerCase("el").includes(destination.toLocaleLowerCase("el"));
      return matchesDestination && (!privateOnly || spot.type === "Ιδιωτικό");
    });

    return [...filtered].sort((a, b) =>
      sortByDistance
        ? Number.parseFloat(a.distance.replace(",", ".")) -
          Number.parseFloat(b.distance.replace(",", "."))
        : (isFuture ? b.predictions[selectedTime] : b.current) -
          (isFuture ? a.predictions[selectedTime] : a.current),
    );
  }, [destination, isFuture, privateOnly, selectedTime, sortByDistance]);

  const totalAvailable = spots.reduce(
    (sum, spot) => sum + (isFuture ? spot.predictions[selectedTime] : spot.current),
    0,
  );
  function search(event) {
    event.preventDefault();
    const nextDestination = query.trim();
    if (!nextDestination) {
      setNotice("Πληκτρολόγησε πρώτα μια περιοχή αναζήτησης.");
      return;
    }
    setDestination(nextDestination);
    setSelectedSpot(1);
    setNotice(`Εμφάνιση διαθέσιμων θέσεων για «${nextDestination}».`);
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
              className="transition-colors hover:text-[#bd9141]"
              onClick={() => announce("Οι αποθηκευμένες θέσεις σου είναι σημειωμένες με ♥.")}
            >
              Τα αγαπημένα μου
            </button>
            <button
              className="transition-colors hover:text-[#bd9141]"
              onClick={() => announce("Η εφαρμογή Parkly είναι έτοιμη για χρήση.")}
            >
              Πώς λειτουργεί
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="hidden items-center gap-2 rounded-full border border-[#e8e7e2] px-4 py-2 text-[12px] font-medium transition hover:border-[#c5a15e] sm:flex"
              onClick={() => announce("Σύνδεση λογαριασμού — διαθέσιμη σύντομα.")}
            >
              <Users size={15} /> Σύνδεση
            </button>
            <button
              aria-label="Άνοιγμα μενού"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e7e2] text-[#55564f] sm:hidden"
              onClick={() => announce("Μενού: Εξερεύνηση · Αγαπημένα · Σύνδεση")}
            >
              <Menu size={17} />
            </button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#eee8dc] text-xs font-semibold text-[#82652e] sm:flex">
              Α
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
                placeholder="Π.χ. Κέντρο Αθήνας"
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
                  <label className="relative ml-auto">
                    <span className="sr-only">Επιλογή ώρας πρόβλεψης</span>
                    <select
                      aria-label="Επιλογή ώρας πρόβλεψης"
                      className="cursor-pointer appearance-none rounded-md border border-[#e9e3d6] bg-[#fcfaf6] py-1 pl-2 pr-6 text-[12px] font-semibold text-[#765b29] outline-none focus:border-[#c8a35d]"
                      onChange={(event) => setSelectedTime(event.target.value)}
                      value={selectedTime}
                    >
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[#987b43]" size={13} />
                  </label>
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
              <h2 className="text-[17px] font-semibold tracking-[-0.4px]">Κοντινές θέσεις</h2>
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
                  <label className="mb-3 flex cursor-pointer items-center justify-between text-[11px] text-[#696a64]">
                    <span>Μόνο ιδιωτικά parking</span>
                    <input
                      checked={privateOnly}
                      className="accent-[#bd9141]"
                      onChange={(event) => setPrivateOnly(event.target.checked)}
                      type="checkbox"
                    />
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
                <p className="text-[10px] text-[#9a8868]">Εκτίμηση για τις {selectedTime} βάσει έξυπνου μοντέλου</p>
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
            <div className="map-surface relative min-h-[420px] overflow-hidden rounded-2xl border border-[#e9e8e3] bg-[#e9ede5] sm:min-h-[490px]">
              <svg
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid slice"
                viewBox="0 0 760 560"
              >
                <rect width="760" height="560" fill="#e9ede5" />
                <path d="M-20 94L780 256M-30 275L760 91M72-20L286 580M405-30L292 590M650-10L456 580" fill="none" stroke="#fffefa" strokeWidth="17" />
                <path d="M-20 94L780 256M-30 275L760 91M72-20L286 580M405-30L292 590M650-10L456 580" fill="none" stroke="#dfe3da" strokeWidth="1.2" />
                <path d="M-30 410L770 370M-20 180L780 470M200-30L35 580M534-20L742 580" fill="none" stroke="#fffefa" strokeWidth="11" />
                <path d="M-30 410L770 370M-20 180L780 470M200-30L35 580M534-20L742 580" fill="none" stroke="#dfe3da" strokeWidth="1" />
                <path d="M105 168L225 155L248 240L158 275L97 236ZM460 305L575 278L613 357L520 395L444 366ZM340 64L410 72L438 136L354 149Z" fill="#dfe7d9" />
                <path d="M42 345L121 321L151 385L77 421ZM584 115L671 129L686 198L612 205Z" fill="#dfe7d9" />
                <path d="M0 520L760 300" fill="none" stroke="#d4b775" strokeWidth="3" strokeDasharray="9 10" opacity=".8" />
              </svg>
              <span className="map-label left-[13%] top-[25%]">ΣΥΝΤΑΓΜΑ</span>
              <span className="map-label left-[58%] top-[17%]">ΚΟΛΩΝΑΚΙ</span>
              <span className="map-label left-[25%] top-[73%]">ΜΟΝΑΣΤΗΡΑΚΙ</span>
              <span className="map-label left-[61%] top-[67%]">ΠΛΑΚΑ</span>
              <span className="map-label left-[43%] top-[46%]">ΕΡΜΟΥ</span>

              {spots.map((spot) => {
                const available = isFuture ? spot.predictions[selectedTime] : spot.current;
                const selected = spot.id === selectedSpot;
                return (
                  <button
                    key={spot.id}
                    aria-label={`${spot.name}: ${available} ελεύθερες θέσεις`}
                    className={`map-pin absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-bold shadow-md transition ${selected ? "border-[#252620] bg-[#252620] text-white ring-2 ring-white/80" : "border-white bg-white text-[#34352f] hover:-translate-y-[55%]"} ${isFuture && !selected ? "border-[#d7b56e] text-[#88672c]" : ""}`}
                    onClick={() => setSelectedSpot(spot.id)}
                    style={{ left: spot.x, top: spot.y }}
                  >
                    {isFuture && <Sparkles size={11} className={selected ? "text-[#e6c27c]" : "text-[#bd9141]"} />}
                    {available}
                  </button>
                );
              })}

              <button
                aria-label="Εστίαση στην τοποθεσία μου"
                className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[#eae9e4] bg-white text-[#5b5c55] shadow-sm transition hover:text-[#bd9141]"
                onClick={() => announce("Δεν απαιτείται τοποθεσία για την προεπισκόπηση του χάρτη.")}
              >
                <LocateFixed size={16} />
              </button>
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-[10px] font-medium text-[#66675f] shadow-sm backdrop-blur">
                <Crosshair size={13} className="text-[#bd9141]" />
                <span>Κέντρο Αθήνας</span>
              </div>
              <div className="absolute bottom-4 left-4 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-[10px] text-[#777870] shadow-sm backdrop-blur">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#b79c67]" />
                {isFuture ? "Εκτιμώμενες θέσεις" : "Διαθέσιμες θέσεις"}
              </div>
              <div className="absolute right-4 top-4 flex flex-col overflow-hidden rounded-lg border border-[#eae9e4] bg-white shadow-sm">
                <button aria-label="Μεγέθυνση χάρτη" className="flex h-8 w-8 items-center justify-center text-[#62635b] hover:bg-[#f7f6f3]" onClick={() => announce("Χάρτης σε μεγέθυνση.")}><Plus size={14} /></button>
                <span className="h-px bg-[#eeede9]" />
                <button aria-label="Σμίκρυνση χάρτη" className="flex h-8 w-8 items-center justify-center text-[#62635b] hover:bg-[#f7f6f3]" onClick={() => announce("Χάρτης σε σμίκρυνση.")}><Minus size={14} /></button>
              </div>
            </div>
          )}

          <div className={`flex flex-col gap-3 ${view === "list" ? "md:grid md:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {spots.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#deddd7] bg-white px-6 text-center">
                <MapPin size={22} className="mb-3 text-[#bd9141]" />
                <p className="text-[14px] font-semibold">Δεν βρέθηκαν θέσεις</p>
                <p className="mt-1 text-[12px] text-[#8a8b84]">Δοκίμασε μια διαφορετική περιοχή ή αφαίρεσε τα φίλτρα.</p>
                <button className="mt-4 text-[12px] font-semibold text-[#9a7737] underline underline-offset-4" onClick={() => { setPrivateOnly(false); setQuery("Κέντρο Αθήνας"); setDestination("Κέντρο Αθήνας"); }}>
                  Επαναφορά αναζήτησης
                </button>
              </div>
            ) : spots.map((spot) => {
              const available = isFuture ? spot.predictions[selectedTime] : spot.current;
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
                        <p className="mt-1 text-[9px] text-[#888981]">απόσταση</p>
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
            ? "Οι προβλέψεις είναι ενδεικτικές και βασίζονται σε dummy δεδομένα."
            : "Η διαθεσιμότητα ενημερώνεται σε πραγματικό χρόνο."}
        </div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#eae9e4] pt-5 text-[10px] text-[#999a93] sm:flex-row">
          <span>© 2025 parkly. Σχεδιασμένο για την πόλη.</span>
          <div className="flex gap-5">
            <button onClick={() => announce("Πολιτική απορρήτου — διαθέσιμη σύντομα.")}>Απόρρητο</button>
            <button onClick={() => announce("Χρειάζεσαι βοήθεια; Η υποστήριξη είναι διαθέσιμη σύντομα.")}>Βοήθεια</button>
          </div>
        </footer>
      </main>

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
