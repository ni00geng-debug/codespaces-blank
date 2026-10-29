const neighborhoods = [
  { area: "Σύνταγμα", landmark: "Πλατεία Συντάγματος", latitude: 37.9755, longitude: 23.7348 },
  { area: "Εμπορικό Τρίγωνο", landmark: "Οδός Ερμού", latitude: 37.9769, longitude: 23.7309 },
  { area: "Πλάκα", landmark: "Οδός Κυδαθηναίων", latitude: 37.9725, longitude: 23.7308 },
  { area: "Αναφιώτικα", landmark: "Οδός Στρατώνος", latitude: 37.9721, longitude: 23.7278 },
  { area: "Μοναστηράκι", landmark: "Πλατεία Μοναστηρακίου", latitude: 37.9763, longitude: 23.7255 },
  { area: "Ψυρρή", landmark: "Οδός Καραϊσκάκη", latitude: 37.9784, longitude: 23.7246 },
  { area: "Θησείο", landmark: "Οδός Αποστόλου Παύλου", latitude: 37.9764, longitude: 23.7209 },
  { area: "Κεραμεικός", landmark: "Πλατεία Κεραμεικού", latitude: 37.9785, longitude: 23.7136 },
  { area: "Γκάζι", landmark: "Οδός Βουτάδων", latitude: 37.9781, longitude: 23.7117 },
  { area: "Ομόνοια", landmark: "Πλατεία Ομονοίας", latitude: 37.9842, longitude: 23.7284 },
  { area: "Μεταξουργείο", landmark: "Πλατεία Αυδή", latitude: 37.9857, longitude: 23.7215 },
  { area: "Σταθμός Λαρίσης", landmark: "Πλατεία Καραϊσκάκη", latitude: 37.9924, longitude: 23.7217 },
  { area: "Βικτώρια", landmark: "Πλατεία Βικτωρίας", latitude: 37.9933, longitude: 23.7292 },
  { area: "Άγιος Παντελεήμονας", landmark: "Πλατεία Αγίου Παντελεήμονα", latitude: 37.9941, longitude: 23.7268 },
  { area: "Πλατεία Αττικής", landmark: "Πλατεία Αττικής", latitude: 37.9991, longitude: 23.7229 },
  { area: "Κυψέλη", landmark: "Οδός Φωκίωνος Νέγρη", latitude: 37.993, longitude: 23.7344 },
  { area: "Άνω Κυψέλη", landmark: "Οδός Αγίας Ζώνης", latitude: 37.999, longitude: 23.741 },
  { area: "Γκύζη", landmark: "Πλατεία Γκύζη", latitude: 37.9894, longitude: 23.7391 },
  { area: "Πολύγωνο", landmark: "Οδός Ευελπίδων", latitude: 37.992, longitude: 23.742 },
  { area: "Νεάπολη Εξαρχείων", landmark: "Οδός Ιπποκράτους", latitude: 37.9825, longitude: 23.7382 },
  { area: "Εξάρχεια", landmark: "Πλατεία Εξαρχείων", latitude: 37.9861, longitude: 23.7348 },
  { area: "Κολωνάκι", landmark: "Πλατεία Κολωνακίου", latitude: 37.9799, longitude: 23.7408 },
  { area: "Λυκαβηττός", landmark: "Οδός Δεινοκράτους", latitude: 37.9797, longitude: 23.746 },
  { area: "Πεδίον του Άρεως", landmark: "Λεωφόρος Αλεξάνδρας", latitude: 37.991, longitude: 23.735 },
  { area: "Άγιος Νικόλαος", landmark: "Πλατεία Αγίου Νικολάου", latitude: 38.001, longitude: 23.731 },
  { area: "Κάτω Πατήσια", landmark: "Σταθμός Κάτω Πατησίων", latitude: 38.011, longitude: 23.728 },
  { area: "Άνω Πατήσια", landmark: "Σταθμός Άνω Πατησίων", latitude: 38.023, longitude: 23.735 },
  { area: "Άγιος Ελευθέριος", landmark: "Σταθμός Αγίου Ελευθερίου", latitude: 38.008, longitude: 23.733 },
  { area: "Προμπονά", landmark: "Οδός Ανθέων", latitude: 38.018, longitude: 23.724 },
  { area: "Ριζούπολη", landmark: "Οδός Ηρακλείου", latitude: 38.022, longitude: 23.746 },
  { area: "Σεπόλια", landmark: "Σταθμός Σεπολίων", latitude: 38.005, longitude: 23.708 },
  { area: "Κολωνός", landmark: "Πλατεία Κολωνού", latitude: 37.991, longitude: 23.713 },
  { area: "Ακαδημία Πλάτωνος", landmark: "Αρχαιολογικό Πάρκο Ακαδημίας Πλάτωνος", latitude: 37.989, longitude: 23.708 },
  { area: "Αττική", landmark: "Πλατεία Αττικής", latitude: 37.999, longitude: 23.722 },
  { area: "Ρουφ", landmark: "Σιδηροδρομικός Σταθμός Ρουφ", latitude: 37.982, longitude: 23.704 },
  { area: "Βοτανικός", landmark: "Οδός Αγίας Άννης", latitude: 37.979, longitude: 23.699 },
  { area: "Πετράλωνα", landmark: "Πλατεία Ηούς", latitude: 37.9683, longitude: 23.7101 },
  { area: "Άνω Πετράλωνα", landmark: "Οδός Τρώων", latitude: 37.968, longitude: 23.717 },
  { area: "Κάτω Πετράλωνα", landmark: "Σταθμός Πετραλώνων", latitude: 37.965, longitude: 23.708 },
  { area: "Κουκάκι", landmark: "Οδός Βεΐκου", latitude: 37.9645, longitude: 23.7275 },
  { area: "Μακρυγιάννη", landmark: "Μουσείο Ακρόπολης", latitude: 37.9684, longitude: 23.7301 },
  { area: "Νέος Κόσμος", landmark: "Σταθμός Μετρό Νέος Κόσμος", latitude: 37.9584, longitude: 23.729 },
  { area: "Άγιος Ιωάννης", landmark: "Σταθμός Μετρό Αγίου Ιωάννη", latitude: 37.958, longitude: 23.735 },
  { area: "Μετς", landmark: "Οδός Μάρκου Μουσούρου", latitude: 37.9646, longitude: 23.7382 },
  { area: "Παγκράτι", landmark: "Πλατεία Προσκόπων", latitude: 37.9679, longitude: 23.7448 },
  { area: "Άγιος Αρτέμιος", landmark: "Πλατεία Αγίου Αρτεμίου", latitude: 37.963, longitude: 23.747 },
  { area: "Γούβα", landmark: "Οδός Βουλιαγμένης", latitude: 37.960, longitude: 23.741 },
  { area: "Ιλίσια", landmark: "Πλατεία Μαδρίτης", latitude: 37.9764, longitude: 23.7557 },
  { area: "Γουδή", landmark: "Πλατεία Ελευθερίας", latitude: 37.981, longitude: 23.769 },
  { area: "Ελληνορώσων", landmark: "Πλατεία Ελευθερίας", latitude: 37.991, longitude: 23.766 },
  { area: "Αμπελόκηποι", landmark: "Πλατεία Μαβίλη", latitude: 37.9901, longitude: 23.7545 },
  { area: "Πανόρμου", landmark: "Σταθμός Μετρό Πανόρμου", latitude: 37.993, longitude: 23.763 },
  { area: "Ερυθρός Σταυρός", landmark: "Νοσοκομείο Ερυθρού Σταυρού", latitude: 37.985, longitude: 23.769 },
  { area: "Εθνική Πινακοθήκη", landmark: "Εθνική Πινακοθήκη", latitude: 37.975, longitude: 23.747 },
  { area: "Ακαδημία", landmark: "Ακαδημία Αθηνών", latitude: 37.9805, longitude: 23.734 },
  { area: "Κάνιγγος", landmark: "Πλατεία Κάνιγγος", latitude: 37.984, longitude: 23.734 },
  { area: "Πλατεία Αμερικής", landmark: "Πλατεία Αμερικής", latitude: 37.999, longitude: 23.735 },
  { area: "Κλωναρίδου", landmark: "Πάρκο Κλωναρίδου", latitude: 38.006, longitude: 23.735 },
  { area: "Πλατεία Καραμανλάκη", landmark: "Πλατεία Καραμανλάκη", latitude: 38.005, longitude: 23.729 },
  { area: "Πλατεία Κολιάτσου", landmark: "Πλατεία Κολιάτσου", latitude: 38.004, longitude: 23.734 },
  { area: "Λόφος Στρέφη", landmark: "Λόφος Στρέφη", latitude: 37.988, longitude: 23.737 },
  { area: "Λόφος Φιλοπάππου", landmark: "Λόφος Φιλοπάππου", latitude: 37.966, longitude: 23.721 },
  { area: "Ζάππειο", landmark: "Ζάππειο Μέγαρο", latitude: 37.970, longitude: 23.736 },
  { area: "Πλατεία Βάθη", landmark: "Πλατεία Βάθη", latitude: 37.986, longitude: 23.723 },
  { area: "Άγιος Κωνσταντίνος", landmark: "Πλατεία Αγίου Κωνσταντίνου", latitude: 37.984, longitude: 23.724 },
  { area: "Πλατεία Κουμουνδούρου", landmark: "Πλατεία Ελευθερίας", latitude: 37.978, longitude: 23.722 },
  { area: "Πλατεία Αβησσυνίας", landmark: "Πλατεία Αβησσυνίας", latitude: 37.976, longitude: 23.723 },
  { area: "Πλατεία Αγίας Ειρήνης", landmark: "Πλατεία Αγίας Ειρήνης", latitude: 37.977, longitude: 23.727 },
  { area: "Φιλοπάππου", landmark: "Οδός Μισαραλιώτου", latitude: 37.964, longitude: 23.722 },
  { area: "Πλατεία Μαβίλη", landmark: "Πλατεία Μαβίλη", latitude: 37.987, longitude: 23.755 },
  { area: "Πλατεία Μεσολογγίου", landmark: "Πλατεία Μεσολογγίου", latitude: 37.968, longitude: 23.747 },
  { area: "Βαρβάκειος Αγορά", landmark: "Κεντρική Αγορά Αθηνών", latitude: 37.980, longitude: 23.726 },
  { area: "Πλατεία Κλαυθμώνος", landmark: "Πλατεία Κλαυθμώνος", latitude: 37.976, longitude: 23.732 },
  { area: "Πλατεία Συντάγματος - Βουλή", landmark: "Μέγαρο Βουλής", latitude: 37.974, longitude: 23.736 },
];

const syntagmaCoordinates = [37.9755, 23.7348];
const facilityNames = ["Κεντρικό", "Πλατείας", "Δημοτικό", "Αγοράς"];

function distanceFromSyntagma(latitude, longitude) {
  const [originLatitude, originLongitude] = syntagmaCoordinates;
  const latitudeDelta = ((latitude - originLatitude) * Math.PI) / 180;
  const longitudeDelta = ((longitude - originLongitude) * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((originLatitude * Math.PI) / 180) *
      Math.cos((latitude * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(haversine));
}

export const parkingSpots = neighborhoods.flatMap((neighborhood, areaIndex) => {
  const parkingCount = 2 + (areaIndex % 3);
  return Array.from({ length: parkingCount }, (_, facilityIndex) => {
    const latitudeOffset = (facilityIndex - (parkingCount - 1) / 2) * 0.001;
    const longitudeOffset =
      (facilityIndex % 2 === 0 ? -1 : 1) *
      (Math.floor(facilityIndex / 2) + 1) *
      0.0007;
    const latitude = neighborhood.latitude + latitudeOffset;
    const longitude = neighborhood.longitude + longitudeOffset;
    const current = 2 + ((areaIndex + facilityIndex) % 3);
    const type =
      (areaIndex + facilityIndex) % 3 === 0 ? "Δημόσιο" : "Ιδιωτικό";
    const distance = distanceFromSyntagma(latitude, longitude);

    return {
      id: `${areaIndex + 1}-${facilityIndex + 1}`,
      area: neighborhood.area,
      landmark: neighborhood.landmark,
      facility: `${facilityNames[facilityIndex]} ${facilityIndex + 1}`,
      name: `Parking ${facilityIndex + 1} — ${neighborhood.area}`,
      address: `${neighborhood.landmark}, ${neighborhood.area}, Αθήνα`,
      latitude,
      longitude,
      total: 24 + ((areaIndex * 7 + facilityIndex * 11) % 48),
      current,
      price: `€${(1.5 + ((areaIndex + facilityIndex) % 6) * 0.2).toFixed(2).replace(".", ",")}`,
      type,
      distance: `${Math.max(0.1, distance).toFixed(1).replace(".", ",")} km`,
    };
  });
});

export function getAvailableSpaces(spot, isFuture, selectedTime) {
  if (!isFuture) return spot.current;
  const [hour, minute] = selectedTime.split(":").map(Number);
  const timeInMinutes = hour * 60 + minute;
  const dailyAvailabilityWave = Math.cos(
    ((timeInMinutes - 180) / 1440) * Math.PI * 2,
  );
  const timeAdjustment = Math.round(((dailyAvailabilityWave + 1) / 2) * 3);
  return 2 + ((spot.current - 2 + timeAdjustment) % 3);
}
