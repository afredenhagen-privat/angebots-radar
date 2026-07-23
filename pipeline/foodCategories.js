// pipeline/foodCategories.js
//
// Positivliste der Marktguru-Eltern-Kategorien, die für einen Einkaufs-Radar
// relevant sind: Lebensmittel, Drogerie, Tierfutter.
//
// Warum über die PRODUKT-Kategorie und nicht über die Händler-Branche:
// Discounter wie Lidl und Aldi mischen Non-Food-Aktionswochen (Werkzeug,
// Gartenmöbel, Kleidung) in dieselbe API-Antwort. Ein Filter auf die Branche
// des Händlers ("Supermarkt") würde das nicht aussortieren — nur ein Filter
// auf die Kategorie des Produkts selbst.
//
// Die IDs stammen aus /categories: dort sind nur Blatt-Kategorien enthalten,
// deren `parentId` auf diese Oberkategorien zeigt.
export const FOOD_PARENT_IDS = new Set([
  // Lebensmittel
  16,  // Spezialitäten, Superfoods, Nudeln, Veganes
  20,  // Süßwaren
  23,  // Kuchen & Feinbackwaren
  69,  // Alkoholfreie Getränke
  70,  // Bier
  101, // Pilze, Kräuter
  102, // Knabbereien
  103, // Fleisch
  104, // Wurst
  106, // Fisch
  107, // Molkerei (Milch, Käse, Joghurt, Butter, Eier)
  108, // Öle, Essig, Dressings
  110, // Backen, Zucker, Mehl
  112, // Fertiggerichte
  113, // Konserven
  115, // Feinkost
  116, // Reis, Getreide, Hülsenfrüchte
  119, // Müsli
  120, // Tiefkühl
  147, // Gemüse
  149, // Obst
  174, // Gewürze
  187, // Herzhafte Aufstriche
  191, // Brot & Brötchen
  193, // Kaffee & Tee
  363, // Wein
  364, // Spirituosen

  // Drogerie & Haushalt
  50,  // Reinigen, Spülmittel, Waschmittel
  126, // Düfte
  136, // Baby (Nahrung, Windeln)
  137, // Körperpflege
  402, // Seife, Duschgel, Deo
  414, // Makeup
  415, // Haushaltsverbrauch (Müllbeutel, Filter, ...)

  // Tierfutter
  83,  // Hund
  85,  // Katze
  90,  // Kleintier
  91,  // Vogel
  93,  // Pferd
])

/**
 * Einzelne Blatt-Kategorien, die trotz erlaubter Elternkategorie raus müssen.
 *
 * Elternkategorie 50 enthält Spülmittel und Waschmittel (wollen wir), aber
 * auch Küchenzubehör und Küchentextilien — darüber landeten Salatschleudern,
 * Brotkörbe und Besteckkästen von Möbelhäusern im Radar.
 */
const AUSNAHMEN = new Set([
  250, // Küchenzubehör
  251, // Küchentextilien
])

/**
 * Händler, die keine Lebensmittelversorger sind. Selbst ihre "Lebensmittel"
 * sind Restaurantangebote (XXXLutz: "Feierabendbier", "Hauspalatschinken"),
 * keine Einkäufe für zuhause.
 */
const AUSGESCHLOSSENE_HAENDLER = new Set(['xxxlutz', 'opti wohnwelt'])

/**
 * Ist das Angebot für uns relevant?
 *
 * Strikt: ohne erkennbare Kategorie fliegt es raus. Ursprünglich war die
 * Regel durchlässig, um keine Lebensmittel zu verlieren — eine Messung über
 * 728 Angebote ergab aber, dass **kein einziges** ohne Kategorie kommt. Die
 * Nachsicht schützte also nichts und liess nur Ausreisser durch.
 */
export function istRelevant(offer) {
  const haendler = offer?.retailer?.trim().toLowerCase()
  if (haendler && AUSGESCHLOSSENE_HAENDLER.has(haendler)) return false

  if (offer?.category_id != null && AUSNAHMEN.has(offer.category_id)) return false

  const parent = offer?.category_parent_id
  if (parent == null) return false
  return FOOD_PARENT_IDS.has(parent)
}
