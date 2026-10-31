import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
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
  ExternalLink,
  Filter,
  History,
  LocateFixed,
  LogOut,
  Map,
  MapPin,
  Menu,
  Minus,
  Navigation,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { isAthensWideSearch, matchesSearch } from "./search.js";
import { getAvailableSpaces, parkingSpots } from "./parkingData.js";

const parkingAreas = [...new Set(parkingSpots.map((spot) => spot.area))];
const nearbyParkingLimit = 8;

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

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalTimeString(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatRouteDistance(meters) {
  return meters < 1000
    ? `${Math.round(meters)} μ.`
    : `${(meters / 1000).toFixed(1).replace(".", ",")} χλμ.`;
}

function formatRouteDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0
    ? `${hours} ώ${remainingMinutes ? ` ${remainingMinutes} λ` : ""}`
    : `${minutes} λεπτά`;
}

function getReservationStartTime(reservation) {
  return reservation.mode === "immediate"
    ? new Date(reservation.createdAt).getTime()
    : new Date(`${reservation.date}T${reservation.time}:00`).getTime();
}

function getNoShowDeadline(reservation) {
  const startsAt = getReservationStartTime(reservation);
  const gracePeriod = reservation.mode === "immediate" ? 60 : 30;
  return startsAt + gracePeriod * 60 * 1000;
}

function isReservationActive(reservation, now = Date.now()) {
  const startsAt = getReservationStartTime(reservation);
  return (
    Number.isFinite(startsAt) &&
    !reservation.cancelledAt &&
    (reservation.arrivedAt
      ? startsAt + Number(reservation.duration) * 60 * 60 * 1000 > now
      : getNoShowDeadline(reservation) > now)
  );
}

function FitParkingSpots({ spots, routeCoordinates }) {
  const map = useMap();
  const previousSpots = useRef(null);

  useEffect(() => {
    if (routeCoordinates?.length > 1) {
      map.fitBounds(routeCoordinates, { padding: [48, 48], maxZoom: 14 });
      previousSpots.current = null;
      return;
    }
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
  }, [map, routeCoordinates, spots]);

  return null;
}

function App() {
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [arrivalMode, setArrivalMode] = useState("now");
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [view, setView] = useState("map");
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [savedSpots, setSavedSpots] = useState([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [parkingType, setParkingType] = useState("Όλα");
  const [selectedArea, setSelectedArea] = useState("Κοντινά");
  const [sortByDistance, setSortByDistance] = useState(true);
  const [sortByPrice, setSortByPrice] = useState("none");
  const [ratingsByUser, setRatingsByUser] = useState(() =>
    JSON.parse(window.localStorage.getItem("parkly-parking-ratings-by-user") || "{}"),
  );
  const [directionsSpot, setDirectionsSpot] = useState(null);
  const [directionsResult, setDirectionsResult] = useState(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsError, setDirectionsError] = useState("");
  const [pendingRating, setPendingRating] = useState(null);
  const [pendingComment, setPendingComment] = useState(null);
  const [pendingBookingSpot, setPendingBookingSpot] = useState(null);
  const [bookingSpot, setBookingSpot] = useState(null);
  const [createdReservation, setCreatedReservation] = useState(null);
  const [bookingMode, setBookingMode] = useState("immediate");
  const [bookingDate, setBookingDate] = useState(() => getLocalDateString());
  const [bookingTime, setBookingTime] = useState(() => getLocalTimeString());
  const [bookingDeadline, setBookingDeadline] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingDuration, setBookingDuration] = useState("2");
  const [bookingComplete, setBookingComplete] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [reservations, setReservations] = useState(() =>
    JSON.parse(window.localStorage.getItem("parkly-reservations") || "[]"),
  );
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [bookingsTab, setBookingsTab] = useState("active");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const [cancelConfirmationId, setCancelConfirmationId] = useState(null);
  const [comments, setComments] = useState(() =>
    JSON.parse(window.localStorage.getItem("parkly-parking-comments") || "{}"),
  );
  const [commentDraft, setCommentDraft] = useState("");
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
  const ratings = authUser ? ratingsByUser[authUser.email] || {} : {};
  const activeReservations = authUser
    ? reservations.filter(
        (reservation) => reservation.userEmail === authUser.email &&
          isReservationActive(reservation, currentTime),
      )
    : [];
  const reservationHistory = authUser
    ? reservations
        .filter((reservation) => {
          if (reservation.userEmail !== authUser.email) return false;
          if (reservation.cancelledAt) return true;
          const reservationEnd =
            getReservationStartTime(reservation) +
            Number(reservation.duration) * 60 * 60 * 1000;
          return Number.isFinite(reservationEnd) && reservationEnd <= currentTime;
        })
        .sort(
          (a, b) => getReservationStartTime(b) - getReservationStartTime(a),
        )
    : [];
  const visibleReservations =
    bookingsTab === "active" ? activeReservations : reservationHistory;
  const arrivalConfirmationDue = activeReservations.find((reservation) => {
    const startsAt = getReservationStartTime(reservation);
    return (
      !reservation.arrivedAt &&
      currentTime >= startsAt &&
      currentTime < getNoShowDeadline(reservation)
    );
  });
  const filteredSpots = useMemo(() => {
    const allCentralAreas = isAthensWideSearch(destination);
    return parkingSpots.filter((spot) => {
      const matchesDestination =
        !destination.trim() ||
        allCentralAreas ||
        matchesSearch(destination, spot);
      const matchesArea =
        selectedArea === "Κοντινά" ||
        selectedArea === "Όλες οι περιοχές" ||
        spot.area === selectedArea;
      return favoritesOnly
        ? savedSpots.includes(spot.id)
        : matchesDestination &&
            matchesArea &&
            (parkingType === "Όλα" || spot.type === parkingType);
    });
  }, [destination, favoritesOnly, parkingType, savedSpots, selectedArea]);

  const spots = useMemo(() => {
    const sortedSpots = [...filteredSpots].sort((a, b) => {
      if (sortByPrice !== "none") {
        const priceA = Number.parseFloat(a.price.replace(/[^\d,]/g, "").replace(",", "."));
        const priceB = Number.parseFloat(b.price.replace(/[^\d,]/g, "").replace(",", "."));
        return sortByPrice === "cheapest" ? priceA - priceB : priceB - priceA;
      }

      return selectedArea === "Κοντινά" || sortByDistance
        ? Number.parseFloat(a.distance.replace(",", ".")) -
            Number.parseFloat(b.distance.replace(",", "."))
        : getAvailableSpaces(b, isFuture, selectedTime) -
            getAvailableSpaces(a, isFuture, selectedTime);
    });
    return selectedArea === "Κοντινά" && !destination.trim()
      ? sortedSpots.slice(0, nearbyParkingLimit)
      : sortedSpots;
  }, [destination, filteredSpots, isFuture, selectedArea, selectedTime, sortByDistance, sortByPrice]);

  const totalAvailable = spots.reduce(
    (sum, spot) => sum + getAvailableSpaces(spot, isFuture, selectedTime),
    0,
  );
  const bookingHourlyRate = bookingSpot
    ? Number.parseFloat(bookingSpot.price.replace(/[^\d,]/g, "").replace(",", "."))
    : 0;
  const bookingEstimate = bookingHourlyRate * Number(bookingDuration);

  function toggleFavoritesView() {
    setFavoritesOnly((showingFavorites) => !showingFavorites);
    setView("list");
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }

  function openBookings(tab = "active") {
    setBookingsTab(tab);
    setBookingsOpen(true);
    setAccountMenuOpen(false);
  }

  function openFavorites() {
    setAccountMenuOpen(false);
    setFavoritesOnly(true);
    setView("list");
    window.setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  function search(event) {
    event.preventDefault();
    const nextDestination = query.trim();
    setDestination(nextDestination);
    setSelectedArea(nextDestination ? "Όλες οι περιοχές" : "Κοντινά");
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

  function rateParking(id, rating) {
    if (!authUser) {
      setPendingRating({ spotId: id, rating });
      openAuth();
      return;
    }

    const previousRating = ratings[id];
    setRatingsByUser((current) => {
      const userRatings = { ...(current[authUser.email] || {}) };
      if (previousRating === rating) {
        delete userRatings[id];
        const nextRatings = { ...current };
        if (Object.keys(userRatings).length === 0) {
          delete nextRatings[authUser.email];
        } else {
          nextRatings[authUser.email] = userRatings;
        }
        return nextRatings;
      }

      userRatings[id] = rating;
      return { ...current, [authUser.email]: userRatings };
    });
    announce(
      previousRating === rating
        ? "Η αξιολόγησή σου αφαιρέθηκε."
        : "Η αξιολόγησή σου καταχωρίστηκε.",
    );
  }

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Η συσκευή σου δεν υποστηρίζει εντοπισμό τοποθεσίας."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        (error) => {
          const messages = {
            1: "Δεν δόθηκε άδεια πρόσβασης στην τοποθεσία.",
            2: "Δεν ήταν δυνατός ο εντοπισμός της τοποθεσίας σου.",
            3: "Έληξε ο χρόνος αναμονής για τον εντοπισμό τοποθεσίας.",
          };
          reject(new Error(messages[error.code] || "Δεν ήταν δυνατός ο εντοπισμός τοποθεσίας."));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  }

  function showDirections(spot) {
    setDirectionsSpot(spot);
    setDirectionsResult(null);
    setDirectionsError("");
    setDirectionsLoading(false);
    setView("map");
    window.setTimeout(() => {
      document.getElementById("directions-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function calculateDirections() {
    if (!directionsSpot) return;
    setDirectionsLoading(true);
    setDirectionsError("");
    try {
      const origin = await getCurrentPosition();
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${directionsSpot.longitude},${directionsSpot.latitude}?overview=full&geometries=geojson&steps=false`,
      );
      if (!response.ok) {
        throw new Error("Η υπηρεσία διαδρομών δεν είναι διαθέσιμη αυτή τη στιγμή.");
      }

      const result = await response.json();
      const route = result.routes?.[0];
      if (result.code !== "Ok" || !route?.geometry?.coordinates?.length) {
        throw new Error("Δεν βρέθηκε διαδρομή για το συγκεκριμένο parking.");
      }

      setDirectionsResult({
        origin,
        coordinates: route.geometry.coordinates.map(([longitude, latitude]) => [
          latitude,
          longitude,
        ]),
        distance: route.distance,
        duration: route.duration,
      });
    } catch (error) {
      setDirectionsError(
        error instanceof Error ? error.message : "Δεν ήταν δυνατός ο υπολογισμός της διαδρομής.",
      );
    } finally {
      setDirectionsLoading(false);
    }
  }

  function submitComment(event, spot) {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text) return;
    if (!authUser) {
      setPendingComment({ spotId: spot.id, text });
      openAuth();
      return;
    }

    setComments((current) => ({
      ...current,
      [spot.id]: [
        {
          id: `${Date.now()}-${authUser.email}`,
          author: authUser?.name || "Επισκέπτης",
          authorEmail: authUser.email,
          text,
          date: new Date().toLocaleDateString("el-GR"),
        },
        ...(current[spot.id] || []),
      ],
    }));
    setCommentDraft("");
  }

  function deleteComment(spotId, commentId) {
    if (!authUser) return;
    setComments((current) => ({
      ...current,
      [spotId]: (current[spotId] || []).filter((comment, index) => {
        const matchesComment = comment.id
          ? comment.id === commentId
          : `legacy-${index}` === commentId;
        const belongsToUser = comment.authorEmail
          ? comment.authorEmail === authUser.email
          : comment.author === "Επισκέπτης";
        return !(matchesComment && belongsToUser);
      }),
    }));
    announce("Το σχόλιό σου διαγράφηκε.");
  }

  function openBooking(spot) {
    if (!authUser) {
      setPendingBookingSpot({ spot, mode: isFuture ? "scheduled" : "immediate" });
      openAuth();
      return;
    }
    setBookingSpot(spot);
    setBookingMode(isFuture ? "scheduled" : "immediate");
    setBookingDate(getLocalDateString());
    setBookingTime(isFuture ? selectedTime : getLocalTimeString());
    setBookingDeadline(null);
    setBookingError("");
    setBookingDuration("2");
    setBookingComplete(false);
  }

  function submitBooking(event) {
    event.preventDefault();
    if (!bookingSpot || !authUser) return;

    const now = new Date();
    const startTime = bookingMode === "immediate"
      ? now.getTime()
      : new Date(`${bookingDate}T${bookingTime}:00`).getTime();
    if (
      !Number.isFinite(startTime) ||
      (bookingMode === "scheduled" && startTime <= now.getTime())
    ) {
      setBookingError("Επίλεξε μελλοντική ημερομηνία και ώρα για την κράτηση.");
      return;
    }

    const hourlyRate = Number.parseFloat(
      bookingSpot.price.replace(/[^\d,]/g, "").replace(",", "."),
    );
    const reservation = {
      id: `${Date.now()}-${bookingSpot.id}`,
      spotId: bookingSpot.id,
      spotName: bookingSpot.name,
      address: bookingSpot.address,
      latitude: bookingSpot.latitude,
      longitude: bookingSpot.longitude,
      userEmail: authUser.email,
      mode: bookingMode,
      date: bookingMode === "immediate" ? getLocalDateString(now) : bookingDate,
      time: bookingMode === "immediate" ? getLocalTimeString(now) : bookingTime,
      duration: Number(bookingDuration),
      estimatedTotal: (hourlyRate * Number(bookingDuration)).toFixed(2),
      createdAt: now.toISOString(),
    };

    setReservations((current) => [reservation, ...current]);
    setCreatedReservation(reservation);
    setBookingDeadline(getNoShowDeadline(reservation));
    setBookingComplete(true);
  }

  function openAuth() {
    setAuthMode("signin");
    setAuthEmail(authUser?.email ?? "");
    setAuthName("");
    setAuthError("");
    setAuthOpen(true);
  }

  function closeAuth() {
    setPendingRating(null);
    setPendingComment(null);
    setPendingBookingSpot(null);
    setAuthOpen(false);
  }

  function completeAuthentication(email, name, message) {
    window.localStorage.setItem("parkly-demo-session-email", email);
    window.localStorage.setItem("parkly-demo-session-name", name);
    setAuthUser({ email, name });
    setAuthOpen(false);

    if (pendingComment) {
      const { spotId, text } = pendingComment;
      setComments((current) => ({
        ...current,
        [spotId]: [
          {
            id: `${Date.now()}-${email}`,
            author: name,
            authorEmail: email,
            text,
            date: new Date().toLocaleDateString("el-GR"),
          },
          ...(current[spotId] || []),
        ],
      }));
      setPendingComment(null);
      setCommentDraft("");
      announce("Το σχόλιό σου δημοσιεύτηκε.");
      return;
    }

    if (pendingBookingSpot) {
      const { spot, mode } = pendingBookingSpot;
      setPendingBookingSpot(null);
      setBookingSpot(spot);
      setBookingMode(mode);
      setBookingDate(getLocalDateString());
      setBookingTime(mode === "scheduled" ? selectedTime : getLocalTimeString());
      setBookingDeadline(null);
      setBookingError("");
      setBookingDuration("2");
      setBookingComplete(false);
      return;
    }

    if (pendingRating) {
      const { spotId, rating } = pendingRating;
      setRatingsByUser((current) => ({
        ...current,
        [email]: { ...(current[email] || {}), [spotId]: rating },
      }));
      setPendingRating(null);
      announce("Η αξιολόγησή σου καταχωρίστηκε.");
      return;
    }
    announce(message);
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
      completeAuthentication(email, name, `Ο λογαριασμός δημιουργήθηκε για το ${email}.`);
      return;
    }

    if (storedName === null) {
      setAuthError("Δεν βρέθηκε λογαριασμός με αυτό το email. Δημιούργησε λογαριασμό.");
      return;
    }

    const name = storedName || email;
    completeAuthentication(email, name, `Συνδέθηκες ως ${email}.`);
  }

  function signOut() {
    window.localStorage.removeItem("parkly-demo-session-email");
    window.localStorage.removeItem("parkly-demo-session-name");
    setAuthUser(null);
    setBookingsOpen(false);
    announce("Αποσυνδέθηκες από τον λογαριασμό σου.");
  }

  function cancelReservation(reservationId) {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === reservationId &&
        reservation.userEmail === authUser?.email
          ? { ...reservation, cancelledAt: new Date().toISOString() }
          : reservation,
      ),
    );
    setCreatedReservation((current) =>
      current?.id === reservationId
        ? { ...current, cancelledAt: new Date().toISOString() }
        : current,
    );
    setCancelConfirmationId(null);
    announce("Η κράτηση ακυρώθηκε.");
  }

  function confirmArrival(reservationId) {
    const arrivedAt = new Date().toISOString();
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === reservationId &&
        reservation.userEmail === authUser?.email &&
        !reservation.cancelledAt
          ? { ...reservation, arrivedAt }
          : reservation,
      ),
    );
    setCreatedReservation((current) =>
      current?.id === reservationId ? { ...current, arrivedAt } : current,
    );
    announce("Η άφιξή σου επιβεβαιώθηκε.");
  }

  useEffect(() => {
    if (!howItWorksOpen && !authOpen && !bookingSpot && !bookingsOpen && !accountMenuOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setHowItWorksOpen(false);
        closeAuth();
        setBookingSpot(null);
        setBookingsOpen(false);
        setAccountMenuOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [accountMenuOpen, authOpen, bookingSpot, bookingsOpen, howItWorksOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    function closeOnOutsideClick(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [accountMenuOpen]);

  useEffect(() => {
    window.localStorage.setItem("parkly-parking-ratings-by-user", JSON.stringify(ratingsByUser));
  }, [ratingsByUser]);

  useEffect(() => {
    window.localStorage.setItem("parkly-parking-comments", JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    window.localStorage.setItem("parkly-reservations", JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    function updateReservationStatus() {
      const now = Date.now();
      setCurrentTime(now);
      setReservations((current) => {
        let changed = false;
        const updated = current.map((reservation) => {
          if (
            !reservation.cancelledAt &&
            !reservation.arrivedAt &&
            getNoShowDeadline(reservation) <= now
          ) {
            changed = true;
            return {
              ...reservation,
              cancelledAt: new Date(getNoShowDeadline(reservation)).toISOString(),
              cancellationReason: "no-show",
            };
          }
          return reservation;
        });
        return changed ? updated : current;
      });
    }

    updateReservationStatus();
    const intervalId = window.setInterval(updateReservationStatus, 15000);
    document.addEventListener("visibilitychange", updateReservationStatus);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateReservationStatus);
    };
  }, []);

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

          <div className="hidden items-center gap-4 text-[12px] font-medium text-[#686963] md:flex lg:gap-8 lg:text-[13px]">
            <a className="text-[#252621]" href="#results">Εξερεύνηση</a>
            <button
              aria-pressed={favoritesOnly}
              className={`transition-colors hover:text-[#bd9141] ${favoritesOnly ? "text-[#a47b35]" : ""}`}
              onClick={toggleFavoritesView}
            >
              {favoritesOnly ? "Όλα τα parking" : `Τα αγαπημένα μου${savedSpots.length ? ` (${savedSpots.length})` : ""}`}
            </button>
            <button
              className="flex items-center gap-1.5 transition-colors hover:text-[#bd9141]"
              onClick={() => openBookings("active")}
            >
              <CalendarDays size={14} />
              Οι κρατήσεις μου ({activeReservations.length})
            </button>
            <button
              className="transition-colors hover:text-[#bd9141]"
              onClick={() => setHowItWorksOpen(true)}
            >
              Πώς λειτουργεί
            </button>
            <a className="transition-colors hover:text-[#bd9141]" href="#contact">
              Επικοινωνήστε μαζί μας
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label={`Οι κρατήσεις μου (${activeReservations.length})`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e7e2] text-[#55564f] md:hidden"
              onClick={() => openBookings("active")}
              type="button"
            >
              <CalendarDays size={16} />
            </button>
            <button
              className="flex items-center gap-2 rounded-full border border-[#e8e7e2] px-3 py-2 text-[11px] font-medium transition hover:border-[#c5a15e] sm:px-4 sm:text-[12px]"
              onClick={() => {
                if (!authUser) openAuth();
                else setAccountMenuOpen((open) => !open);
              }}
              aria-expanded={accountMenuOpen}
            >
              <Users size={15} /> {authUser ? "Λογαριασμός" : "Σύνδεση"}
            </button>
            <button
              aria-label={favoritesOnly ? "Εμφάνιση όλων των parking" : "Τα αγαπημένα μου"}
              aria-pressed={favoritesOnly}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e7e2] text-[#55564f] sm:hidden"
              onClick={toggleFavoritesView}
            >
              <Bookmark size={16} fill={favoritesOnly ? "currentColor" : "none"} />
            </button>
            <div className="relative" ref={accountMenuRef}>
              <button
                aria-label="Μενού λογαριασμού"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee8dc] text-xs font-semibold text-[#82652e] transition hover:ring-2 hover:ring-[#d8c49e]"
                onClick={() => {
                  if (!authUser) openAuth();
                  else setAccountMenuOpen((open) => !open);
                }}
                type="button"
              >
                {authUser ? (authUser.name[0] || authUser.email[0]).toLocaleUpperCase("el") : "Α"}
              </button>
              {accountMenuOpen && authUser && (
                <div
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-xl border border-[#eeede9] bg-white py-2 shadow-xl"
                  role="menu"
                >
                  <div className="border-b border-[#f0efec] px-4 pb-3 pt-2">
                    <p className="truncate text-[12px] font-semibold text-[#20211f]">{authUser.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[#888981]">{authUser.email}</p>
                  </div>
                  <button
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[11px] text-[#55564f] hover:bg-[#f8f7f4]"
                    onClick={() => openBookings("active")}
                    role="menuitem"
                    type="button"
                  >
                    <span className="flex items-center gap-2"><CalendarDays size={14} /> Οι κρατήσεις μου</span>
                    <span className="rounded-full bg-[#f3f2ef] px-2 py-0.5 text-[9px]">{activeReservations.length}</span>
                  </button>
                  <button
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[11px] text-[#55564f] hover:bg-[#f8f7f4]"
                    onClick={() => openBookings("history")}
                    role="menuitem"
                    type="button"
                  >
                    <span className="flex items-center gap-2"><History size={14} /> Ιστορικό κρατήσεων</span>
                    <span className="rounded-full bg-[#f3f2ef] px-2 py-0.5 text-[9px]">{reservationHistory.length}</span>
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[11px] text-[#55564f] hover:bg-[#f8f7f4]"
                    onClick={openFavorites}
                    role="menuitem"
                    type="button"
                  >
                    <Bookmark size={14} /> Τα αγαπημένα μου
                  </button>
                  <button
                    className="mt-1 flex w-full items-center gap-2 border-t border-[#f0efec] px-4 pt-3 text-left text-[11px] text-[#9b3c32] hover:bg-[#fcf5f2]"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      signOut();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <LogOut size={14} /> Αποσύνδεση
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-10 pt-8 sm:px-8 sm:pt-10 lg:px-12">
        {arrivalConfirmationDue && (
          <section
            aria-label="Επιβεβαίωση άφιξης"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadbbd] bg-[#fcfaf5] px-4 py-3"
          >
            <div>
              <p className="text-[12px] font-semibold text-[#6c5428]">
                Έφτασες στο {arrivalConfirmationDue.spotName};
              </p>
              <p className="mt-1 text-[10px] text-[#8a7959]">
                Επιβεβαίωσε την άφιξή σου για να μην ακυρωθεί η κράτηση.
              </p>
            </div>
            <button
              className="rounded-lg bg-[#20211f] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#353630]"
              onClick={() => confirmArrival(arrivalConfirmationDue.id)}
              type="button"
            >
              Επιβεβαίωση άφιξης
            </button>
          </section>
        )}
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
                    <span className="mb-1.5 block">Περιοχή</span>
                    <select
                      aria-label="Φίλτρο περιοχής"
                      className="w-full rounded-md border border-[#e9e8e3] bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[#c8a35d]"
                      onChange={(event) => setSelectedArea(event.target.value)}
                      value={selectedArea}
                    >
                      <option value="Κοντινά">Κοντινά parking (8)</option>
                      <option value="Όλες οι περιοχές">Όλες οι περιοχές</option>
                      {parkingAreas.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </label>
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
                    onClick={() => {
                      setSortByDistance((byDistance) => !byDistance);
                      setSortByPrice("none");
                    }}
                  >
                    <span>Ταξινόμηση: {sortByDistance ? "Απόσταση" : "Διαθεσιμότητα"}</span>
                    <ArrowDownUp size={13} />
                  </button>
                  <label className="mt-3 block border-t border-[#f1f0ed] pt-3 text-[11px] text-[#696a64]">
                    <span className="mb-1.5 block">Τιμή</span>
                    <select
                      aria-label="Ταξινόμηση τιμής"
                      className="w-full rounded-md border border-[#e9e8e3] bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[#c8a35d]"
                      onChange={(event) => setSortByPrice(event.target.value)}
                      value={sortByPrice}
                    >
                      <option value="none">Προεπιλογή</option>
                      <option value="cheapest">Αύξουσα τιμή</option>
                      <option value="most-expensive">Φθίνουσα τιμή</option>
                    </select>
                  </label>
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
                <p className="text-[10px] text-[#9a8868]">Εκτίμηση για τις {selectedTime}</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-[#856a39]">
              {totalAvailable} θέσεις εκτιμώμενες συνολικά
            </span>
          </div>
        )}

        {directionsSpot && (
          <section
            aria-label="Οδηγίες διαδρομής"
            aria-live="polite"
            id="directions-panel"
            className="mb-4 rounded-2xl border border-[#e9e3d6] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[1px] text-[#a47b35]">
                  <Navigation size={13} /> Διαδρομή προς
                </p>
                <h2 className="mt-1 truncate text-[14px] font-semibold">{directionsSpot.name}</h2>
                <p className="mt-1 text-[11px] text-[#777870]">{directionsSpot.address}</p>
              </div>
              <button
                aria-label="Κλείσιμο οδηγιών"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#777870] hover:bg-[#f4f3f0]"
                onClick={() => {
                  setDirectionsSpot(null);
                  setDirectionsResult(null);
                  setDirectionsError("");
                }}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            {directionsResult ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0efec] pt-4">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[17px] font-semibold">{formatRouteDistance(directionsResult.distance)}</p>
                    <p className="mt-0.5 text-[10px] text-[#888981]">οδική απόσταση</p>
                  </div>
                  <div>
                    <p className="text-[17px] font-semibold">{formatRouteDuration(directionsResult.duration)}</p>
                    <p className="mt-0.5 text-[10px] text-[#888981]">εκτιμώμενος χρόνος</p>
                  </div>
                </div>
                <a
                  className="inline-flex items-center gap-2 rounded-lg bg-[#20211f] px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#353630]"
                  href={`https://www.google.com/maps/dir/?api=1&origin=${directionsResult.origin.latitude},${directionsResult.origin.longitude}&destination=${directionsSpot.latitude},${directionsSpot.longitude}&travelmode=driving`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Άνοιγμα διαδρομής <ExternalLink size={13} />
                </a>
                <p className="w-full text-[10px] text-[#888981]">
                  Εκτίμηση οδήγησης χωρίς τρέχουσα κίνηση. Η τοποθεσία χρησιμοποιήθηκε για τον υπολογισμό μέσω OSRM.
                </p>
              </div>
            ) : (
              <div className="mt-4 border-t border-[#f0efec] pt-4">
                <p className="text-[11px] leading-relaxed text-[#777870]">
                  Για να υπολογιστούν η οδική απόσταση και ο χρόνος, η τοποθεσία σου θα ζητηθεί από τη συσκευή και θα σταλεί στην υπηρεσία δρομολόγησης OSRM.
                </p>
                {directionsError && (
                  <p className="mt-2 text-[11px] text-red-700" role="alert">{directionsError}</p>
                )}
                <button
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#20211f] px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#353630] disabled:cursor-wait disabled:opacity-60"
                  disabled={directionsLoading}
                  onClick={calculateDirections}
                  type="button"
                >
                  {directionsLoading ? "Υπολογισμός διαδρομής..." : "Χρήση τοποθεσίας και υπολογισμός"}
                  {!directionsLoading && <ArrowRight size={13} />}
                </button>
              </div>
            )}
          </section>
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
                <FitParkingSpots
                  routeCoordinates={directionsResult?.coordinates}
                  spots={spots}
                />
                {directionsResult && (
                  <>
                    <Polyline
                      pathOptions={{ color: "#b78331", opacity: 0.9, weight: 6 }}
                      positions={directionsResult.coordinates}
                    />
                    <CircleMarker
                      center={[
                        directionsResult.origin.latitude,
                        directionsResult.origin.longitude,
                      ]}
                      pathOptions={{ color: "#fff", fillColor: "#2f7b55", fillOpacity: 1, weight: 3 }}
                      radius={8}
                    >
                      <Tooltip direction="top">Η τοποθεσία σου</Tooltip>
                    </CircleMarker>
                  </>
                )}
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
                        alt={`${spot.area}: ${available} διαθέσιμες θέσεις`}
                        eventHandlers={{ click: () => setSelectedSpot(spot.id) }}
                        icon={icon}
                        position={[spot.latitude, spot.longitude]}
                        title={`${spot.area}: ${available} διαθέσιμες θέσεις`}
                      >
                        <Tooltip direction="top" offset={[0, -16]}>
                          {spot.area}: {available} θέσεις
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
                <span>{selectedArea === "Κοντινά" ? "Κοντινά" : selectedArea} · {spots.length} parking</span>
              </div>
              <div className="absolute bottom-4 left-4 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-[10px] text-[#777870] shadow-sm backdrop-blur">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#b79c67]" />
                Θέσεις parking
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
                    setSelectedArea("Κοντινά");
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

                  <div className="mt-3 flex items-center gap-1" aria-label="Αξιολόγηση parking">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                                aria-label={
                                  ratings[spot.id] === rating
                                    ? `Αφαίρεση αξιολόγησης ${rating} αστέρων`
                                    : `Αξιολόγηση ${rating} από 5 αστέρια`
                                }
                        aria-pressed={ratings[spot.id] === rating}
                        className={`p-0.5 transition ${ratings[spot.id] >= rating ? "text-[#bd9141]" : "text-[#d8d6cf] hover:text-[#bd9141]"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          rateParking(spot.id, rating);
                        }}
                        type="button"
                      >
                        <Star fill={ratings[spot.id] >= rating ? "currentColor" : "none"} size={15} />
                      </button>
                    ))}
                    <span className="ml-1 text-[10px] text-[#888981]">
                      {ratings[spot.id]
                        ? `Η αξιολόγησή σου: ${ratings[spot.id]}/5`
                        : authUser ? "Αξιολόγησε" : "Σύνδεση για αξιολόγηση"}
                    </span>
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
                      onClick={(event) => { event.stopPropagation(); showDirections(spot); }}
                    >
                      Οδηγίες <ArrowUpRight size={13} className="text-[#e2bd78]" />
                    </button>
                    <button
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e9e8e3] text-[10px] font-semibold text-[#55564f] transition hover:border-[#cfbd97] hover:bg-[#fcfaf5]"
                      onClick={(event) => { event.stopPropagation(); openBooking(spot); }}
                    >
                      Κράτηση <ArrowRight size={13} />
                    </button>
                  </div>

                  {isSelected && (
                    <section
                      aria-label={`Σχόλια για ${spot.name}`}
                      className="mt-4 border-t border-[#f0efec] pt-4"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <h4 className="text-[12px] font-semibold">Σχόλια επισκεπτών</h4>
                      <div className="mt-3 space-y-3">
                        {(comments[spot.id] || []).length === 0 ? (
                          <p className="text-[11px] text-[#888981]">Δεν υπάρχουν ακόμη σχόλια. Γράψε το πρώτο.</p>
                        ) : (
                          comments[spot.id].map((comment, index) => (
                            <div className="rounded-lg bg-[#f8f7f4] px-3 py-2.5" key={`${comment.date}-${index}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold">{comment.author}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-[#999a93]">{comment.date}</span>
                                  {authUser &&
                                    (comment.authorEmail === authUser.email ||
                                      (!comment.authorEmail && comment.author === "Επισκέπτης")) && (
                                      <button
                                        aria-label={
                                          comment.authorEmail
                                            ? "Διαγραφή σχολίου"
                                            : "Διαγραφή παλαιού σχολίου επισκέπτη"
                                        }
                                        className="flex h-6 w-6 items-center justify-center rounded-md text-[#999a93] hover:bg-[#eeeae2] hover:text-[#9b3c32]"
                                        onClick={() => deleteComment(spot.id, comment.id || `legacy-${index}`)}
                                        type="button"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                </div>
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#686963]">{comment.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <form className="mt-3 space-y-2" onSubmit={(event) => submitComment(event, spot)}>
                        <label className="sr-only" htmlFor={`comment-${spot.id}`}>Γράψε ένα σχόλιο</label>
                        <textarea
                          className="w-full resize-y rounded-lg border border-[#e9e8e3] px-3 py-2 text-[11px] outline-none focus:border-[#c8a35d]"
                          id={`comment-${spot.id}`}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          placeholder="Μοιράσου την εμπειρία σου..."
                          rows={2}
                          value={commentDraft}
                        />
                        <button
                          className="rounded-lg bg-[#20211f] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#353630]"
                          type="submit"
                        >
                          {authUser ? "Δημοσίευση σχολίου" : "Σύνδεση και δημοσίευση"}
                        </button>
                      </form>
                    </section>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-5 border-t border-[#eae9e4] pt-6 text-[11px] text-[#777870] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-medium">© 2025 parkly. Σχεδιασμένο για την πόλη.</span>
            <div className="mt-3 flex gap-5 text-[10px] text-[#999a93]">
            <button onClick={() => announce("Πολιτική απορρήτου — διαθέσιμη σύντομα.")}>Απόρρητο</button>
            <button onClick={() => announce("Χρειάζεσαι βοήθεια; Η υποστήριξη είναι διαθέσιμη σύντομα.")}>Βοήθεια</button>
            </div>
          </div>
          <div className="space-y-1 sm:text-right" id="contact">
            <h2 className="mb-2 text-[12px] font-semibold text-[#20211f]">Επικοινωνήστε μαζί μας</h2>
            <a className="block hover:text-[#a47b35]" href="mailto:hello@parkly.gr">hello@parkly.gr</a>
            <a className="block hover:text-[#a47b35]" href="tel:+302101234567">+30 210 123 4567</a>
            <p>Αθήνα, Ελλάδα</p>
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
              <li><span className="mr-2 font-semibold text-[#a47b35]">3.</span>Για μελλοντική άφιξη, επίλεξε ώρα και δες την πρόβλεψη.</li>
            </ol>
            <button
              className="mt-5 w-full rounded-xl bg-[#20211f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#353630]"
              onClick={() => setHowItWorksOpen(false)}
            >
              Κατάλαβα
            </button>
          </section>
        </div>
      )}

      {bookingSpot && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#20211f]/40 p-4"
          onClick={() => setBookingSpot(null)}
        >
          <section
            aria-labelledby="booking-title"
            aria-modal="true"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#bd9141]">
                  parkly.
                </p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.5px]" id="booking-title">
                  {bookingComplete ? "Η κράτησή σου καταχωρήθηκε" : "Κράτηση θέσης"}
                </h2>
              </div>
              <button
                aria-label="Κλείσιμο"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#777870] hover:bg-[#f4f3f0]"
                onClick={() => setBookingSpot(null)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-[#eeede9] bg-[#faf9f6] p-4">
              <p className="text-[13px] font-semibold">{bookingSpot.name}</p>
              <p className="mt-1 text-[11px] text-[#777870]">{bookingSpot.address}</p>
              <p className="mt-2 text-[11px] text-[#777870]">{bookingSpot.price} / ώρα</p>
            </div>

            {bookingComplete ? (
              <div className="mt-5">
                <div className="flex items-start gap-3 rounded-xl bg-[#f3f7ef] p-4">
                  <Check className="mt-0.5 shrink-0 text-[#4c7a3d]" size={18} />
                  <div className="text-[12px] leading-relaxed text-[#53634d]">
                    <p className="font-semibold">Η αίτηση αποθηκεύτηκε σε αυτή τη συσκευή.</p>
                    <p className="mt-1">
                      {bookingDate} στις {bookingTime} · {bookingDuration} ώρες ·
                      {" "}εκτιμώμενο σύνολο €{bookingEstimate.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-[#8a7959]">
                  Επιβεβαίωσε την άφιξή σου έως τις{" "}
                  {bookingDeadline
                    ? new Date(bookingDeadline).toLocaleString("el-GR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : ""}
                  . Διαφορετικά, η κράτηση θα ακυρωθεί αυτόματα.
                </p>
                {createdReservation?.mode === "immediate" && !createdReservation.arrivedAt && (
                  <button
                    className="mt-4 w-full rounded-xl border border-[#d8c49e] bg-[#fcfaf5] px-4 py-2.5 text-[12px] font-semibold text-[#715827] transition hover:bg-[#f7f0e2]"
                    onClick={() => confirmArrival(createdReservation.id)}
                    type="button"
                  >
                    Επιβεβαίωση άφιξης τώρα
                  </button>
                )}
                {createdReservation?.arrivedAt && (
                  <p className="mt-4 rounded-lg bg-[#f3f7ef] px-3 py-2.5 text-[11px] font-semibold text-[#4c7a3d]">
                    Η άφιξή σου επιβεβαιώθηκε.
                  </p>
                )}
                {createdReservation?.mode === "scheduled" && (
                  <p className="mt-3 text-[10px] text-[#777870]">
                    Όταν φτάσει η ώρα της κράτησης, θα εμφανιστεί στην αρχική οθόνη και στις «Κρατήσεις μου» η επιλογή επιβεβαίωσης άφιξης.
                  </p>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-[#888981]">
                  Για πραγματική δέσμευση θέσης απαιτείται επιβεβαίωση από το parking. Δεν πραγματοποιείται πληρωμή μέσα από την εφαρμογή.
                </p>
                <button
                  className="mt-5 w-full rounded-xl bg-[#20211f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#353630]"
                  onClick={() => setBookingSpot(null)}
                  type="button"
                >
                  Τέλος
                </button>
              </div>
            ) : (
              <div>
                <form className="mt-5 space-y-4" onSubmit={submitBooking}>
                  <div className="grid grid-cols-2 rounded-lg bg-[#f4f3f0] p-1">
                    <button
                      aria-pressed={bookingMode === "immediate"}
                      className={`rounded-md px-3 py-2 text-[11px] font-medium ${bookingMode === "immediate" ? "bg-white text-[#20211f] shadow-sm" : "text-[#777870]"}`}
                      onClick={() => {
                        setBookingMode("immediate");
                        setBookingDate(getLocalDateString());
                        setBookingTime(getLocalTimeString());
                        setBookingError("");
                      }}
                      type="button"
                    >
                      Κράτηση τώρα
                    </button>
                    <button
                      aria-pressed={bookingMode === "scheduled"}
                      className={`rounded-md px-3 py-2 text-[11px] font-medium ${bookingMode === "scheduled" ? "bg-white text-[#20211f] shadow-sm" : "text-[#777870]"}`}
                      onClick={() => {
                        setBookingMode("scheduled");
                        setBookingDate(getLocalDateString());
                        setBookingTime(getLocalTimeString(new Date(Date.now() + 60 * 60 * 1000)));
                        setBookingError("");
                      }}
                      type="button"
                    >
                      Μελλοντική ώρα
                    </button>
                  </div>
                  {bookingMode === "immediate" ? (
                    <div className="rounded-lg bg-[#faf9f6] px-3 py-2.5 text-[11px] text-[#686963]">
                      Άφιξη τώρα · Ώρα {getLocalTimeString()} (24ωρη μορφή)
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-[12px] font-medium text-[#55564f]">
                        Ημερομηνία
                        <input
                          className="mt-1.5 w-full rounded-lg border border-[#e9e8e3] px-3 py-2.5 text-[13px] outline-none focus:border-[#c8a35d]"
                          min={getLocalDateString()}
                          onChange={(event) => {
                            setBookingDate(event.target.value);
                            setBookingError("");
                          }}
                          required
                          type="date"
                          value={bookingDate}
                        />
                      </label>
                      <fieldset>
                        <legend className="text-[12px] font-medium text-[#55564f]">Ώρα άφιξης (24ωρη μορφή)</legend>
                        <div className="mt-1.5 flex items-center gap-2">
                          <label className="flex-1">
                            <span className="sr-only">Ώρα, από 00 έως 23</span>
                            <select
                              aria-label="Ώρα, από 00 έως 23"
                              className="w-full rounded-lg border border-[#e9e8e3] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#c8a35d]"
                              onChange={(event) => {
                                setBookingTime(`${event.target.value}:${bookingTime.slice(3)}`);
                                setBookingError("");
                              }}
                              value={bookingTime.slice(0, 2)}
                            >
                              {Array.from({ length: 24 }, (_, hour) => {
                                const value = String(hour).padStart(2, "0");
                                return <option key={value} value={value}>{value}</option>;
                              })}
                            </select>
                          </label>
                          <span aria-hidden="true" className="font-semibold">:</span>
                          <label className="flex-1">
                            <span className="sr-only">Λεπτά, από 00 έως 59</span>
                            <select
                              aria-label="Λεπτά, από 00 έως 59"
                              className="w-full rounded-lg border border-[#e9e8e3] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#c8a35d]"
                              onChange={(event) => {
                                setBookingTime(`${bookingTime.slice(0, 2)}:${event.target.value}`);
                                setBookingError("");
                              }}
                              value={bookingTime.slice(3)}
                            >
                              {Array.from({ length: 60 }, (_, minute) => {
                                const value = String(minute).padStart(2, "0");
                                return <option key={value} value={value}>{value}</option>;
                              })}
                            </select>
                          </label>
                        </div>
                      </fieldset>
                    </div>
                  )}
                  <label className="block text-[12px] font-medium text-[#55564f]">
                    Διάρκεια στάθμευσης
                    <select
                      className="mt-1.5 w-full rounded-lg border border-[#e9e8e3] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#c8a35d]"
                      onChange={(event) => setBookingDuration(event.target.value)}
                      value={bookingDuration}
                    >
                      {Array.from({ length: 12 }, (_, index) => {
                        const hours = String(index + 1);
                        return <option key={hours} value={hours}>{hours} {index === 0 ? "ώρα" : "ώρες"}</option>;
                      })}
                    </select>
                  </label>
                  <div className="flex items-center justify-between border-t border-[#f0efec] pt-4 text-[13px]">
                    <span className="text-[#686963]">Εκτιμώμενο σύνολο</span>
                    <strong>€{bookingEstimate.toFixed(2).replace(".", ",")}</strong>
                  </div>
                  <p className="text-[10px] leading-relaxed text-[#888981]">
                    {bookingMode === "immediate"
                      ? "Αν δεν επιβεβαιώσεις την άφιξή σου μέσα σε 1 ώρα, η κράτηση ακυρώνεται αυτόματα."
                      : "Αν δεν επιβεβαιώσεις την άφιξή σου μέσα σε 30 λεπτά από την ώρα κράτησης, ακυρώνεται αυτόματα."}
                    {" "}Η αίτηση αποθηκεύεται σε αυτή τη συσκευή.
                  </p>
                  {bookingError && (
                    <p className="text-[11px] text-red-700" role="alert">{bookingError}</p>
                  )}
                  <button
                    className="w-full rounded-xl bg-[#20211f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#353630]"
                    type="submit"
                  >
                    Συνέχεια κράτησης
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      )}

      {bookingsOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#20211f]/40 p-4"
          onClick={() => setBookingsOpen(false)}
        >
          <section
            aria-labelledby="my-bookings-title"
            aria-modal="true"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#bd9141]">
                  parkly.
                </p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.5px]" id="my-bookings-title">
                  {bookingsTab === "active" ? "Οι κρατήσεις μου" : "Ιστορικό κρατήσεων"}
                </h2>
              </div>
              <button
                aria-label="Κλείσιμο κρατήσεων"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#777870] hover:bg-[#f4f3f0]"
                onClick={() => setBookingsOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>

            {authUser && (
              <div className="mt-5 grid grid-cols-2 rounded-lg bg-[#f4f3f0] p-1">
                <button
                  aria-pressed={bookingsTab === "active"}
                  className={`rounded-md px-3 py-2 text-[11px] font-medium ${bookingsTab === "active" ? "bg-white text-[#20211f] shadow-sm" : "text-[#777870]"}`}
                  onClick={() => setBookingsTab("active")}
                  type="button"
                >
                  Ενεργές ({activeReservations.length})
                </button>
                <button
                  aria-pressed={bookingsTab === "history"}
                  className={`rounded-md px-3 py-2 text-[11px] font-medium ${bookingsTab === "history" ? "bg-white text-[#20211f] shadow-sm" : "text-[#777870]"}`}
                  onClick={() => setBookingsTab("history")}
                  type="button"
                >
                  Ιστορικό ({reservationHistory.length})
                </button>
              </div>
            )}

            {!authUser ? (
              <div className="mt-5 rounded-xl bg-[#faf9f6] p-4 text-center">
                <p className="text-[12px] text-[#686963]">Συνδέσου για να δεις και να διαχειριστείς τις κρατήσεις σου.</p>
                <button
                  className="mt-4 rounded-lg bg-[#20211f] px-4 py-2.5 text-[11px] font-semibold text-white"
                  onClick={() => {
                    setBookingsOpen(false);
                    openAuth();
                  }}
                  type="button"
                >
                  Σύνδεση
                </button>
              </div>
            ) : visibleReservations.length === 0 ? (
              <p className="mt-5 rounded-xl bg-[#faf9f6] px-4 py-6 text-center text-[12px] text-[#777870]">
                {bookingsTab === "active"
                  ? "Δεν έχεις ενεργές κρατήσεις αυτή τη στιγμή."
                  : "Δεν υπάρχει ακόμη ιστορικό κρατήσεων."}
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {bookingsTab === "active" && (
                  <p className="rounded-lg bg-[#fcfaf5] px-3 py-2 text-[10px] leading-relaxed text-[#8a7959]">
                    Οι αιτήσεις αποθηκεύονται σε αυτή τη συσκευή. Η οριστική κράτηση χρειάζεται επιβεβαίωση από το parking.
                  </p>
                )}
                {visibleReservations.map((reservation) => {
                  const startsAt = getReservationStartTime(reservation);
                  const noShowDeadline = getNoShowDeadline(reservation);
                  const canConfirmArrival =
                    bookingsTab === "active" &&
                    !reservation.arrivedAt &&
                    currentTime >= startsAt &&
                    currentTime < noShowDeadline;
                  return (
                    <article className="rounded-xl border border-[#eeede9] p-4" key={reservation.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[13px] font-semibold">{reservation.spotName}</h3>
                        <p className="mt-1 text-[10px] text-[#777870]">{reservation.address}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${bookingsTab === "history" ? reservation.cancelledAt ? "bg-[#fcf5f2] text-[#9b3c32]" : "bg-[#f3f2ef] text-[#686963]" : reservation.arrivedAt ? "bg-[#f3f7ef] text-[#4c7a3d]" : "bg-[#fcfaf5] text-[#8a6c34]"}`}>
                        {bookingsTab === "history"
                          ? reservation.cancelledAt ? "Ακυρώθηκε" : "Ολοκληρώθηκε"
                          : reservation.arrivedAt ? "Άφιξη επιβεβαιώθηκε" : "Εκκρεμεί άφιξη"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#686963]">
                      <span>{reservation.date} · {reservation.time}</span>
                      <span>{reservation.duration} ώρες</span>
                      <span>€{reservation.estimatedTotal.replace(".", ",")}</span>
                    </div>
                    <button
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#20211f] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#353630]"
                      onClick={() => {
                        const spot = parkingSpots.find(
                          (parkingSpot) => parkingSpot.id === reservation.spotId,
                        ) || {
                          id: reservation.spotId,
                          name: reservation.spotName,
                          address: reservation.address,
                          latitude: reservation.latitude,
                          longitude: reservation.longitude,
                        };
                        setBookingsOpen(false);
                        showDirections(spot);
                      }}
                      type="button"
                    >
                      Οδηγίες προς το parking <ArrowUpRight size={13} className="text-[#e2bd78]" />
                    </button>
                    {bookingsTab === "active" && !reservation.arrivedAt && (
                      <p className="mt-3 text-[10px] text-[#8a7959]">
                        Επιβεβαίωσε άφιξη έως τις{" "}
                        {new Date(noShowDeadline).toLocaleString("el-GR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}{" "}
                        για να μην ακυρωθεί αυτόματα.
                      </p>
                    )}
                    {bookingsTab === "active" && cancelConfirmationId === reservation.id ? (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#fcf5f2] p-3">
                        <span className="text-[10px] text-[#805046]">Να ακυρωθεί αυτή η κράτηση;</span>
                        <div className="flex gap-2">
                          <button
                            className="rounded-md border border-[#e5dedb] px-2.5 py-1.5 text-[10px] text-[#686963]"
                            onClick={() => setCancelConfirmationId(null)}
                            type="button"
                          >
                            Όχι
                          </button>
                          <button
                            className="rounded-md bg-[#9b3c32] px-2.5 py-1.5 text-[10px] font-semibold text-white"
                            onClick={() => cancelReservation(reservation.id)}
                            type="button"
                          >
                            Ναι, ακύρωση
                          </button>
                        </div>
                      </div>
                    ) : bookingsTab === "active" ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {canConfirmArrival && (
                          <button
                            className="rounded-lg bg-[#20211f] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#353630]"
                            onClick={() => confirmArrival(reservation.id)}
                            type="button"
                          >
                            Επιβεβαίωση άφιξης
                          </button>
                        )}
                        <button
                          className="rounded-lg border border-[#eadbd7] px-3 py-2 text-[10px] font-semibold text-[#9b3c32] transition hover:bg-[#fcf5f2]"
                          onClick={() => setCancelConfirmationId(reservation.id)}
                          type="button"
                        >
                          Ακύρωση κράτησης
                        </button>
                      </div>
                    ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {authOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#20211f]/40 p-4"
          onClick={closeAuth}
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
                  {pendingRating
                    ? authMode === "signup" ? "Δημιούργησε λογαριασμό για αξιολόγηση" : "Συνδέσου για αξιολόγηση"
                    : authMode === "signup" ? "Δημιουργία λογαριασμού" : "Σύνδεση"}
                </h2>
              </div>
              <button
                aria-label="Κλείσιμο"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#777870] hover:bg-[#f4f3f0]"
                onClick={closeAuth}
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
