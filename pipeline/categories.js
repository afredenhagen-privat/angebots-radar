// pipeline/categories.js
//
// Diese Begriffe werden bei jedem Lauf zusätzlich zu den Merkzettel-Einträgen
// abgefragt. Sie speisen den Stöber-Tab UND den Produktkatalog, aus dem sich
// Suche und Suchhilfe bedienen — je breiter die Liste, desto besser die
// Vorschläge. Die Laufzeit steigt dabei nur linear (~0,4 s je Begriff und PLZ).
export const CATEGORIES = [
  // Molkerei & Kühlregal
  'Butter', 'Margarine', 'Käse', 'Frischkäse', 'Mozzarella', 'Gouda', 'Milch',
  'Joghurt', 'Quark', 'Sahne', 'Eier', 'Pudding',
  // Fleisch, Wurst, Fisch
  'Hähnchen', 'Hackfleisch', 'Schnitzel', 'Steak', 'Wurst', 'Salami', 'Schinken',
  'Bratwurst', 'Lachs', 'Thunfisch',
  // Brot & Frühstück
  'Brot', 'Brötchen', 'Toast', 'Müsli', 'Cornflakes', 'Marmelade', 'Honig',
  'Nutella', 'Kaffee', 'Espresso', 'Tee',
  // Grundnahrungsmittel
  'Nudeln', 'Reis', 'Kartoffeln', 'Mehl', 'Zucker', 'Öl', 'Olivenöl', 'Essig',
  'Salz', 'Tomatensoße', 'Pesto', 'Konserven',
  // Obst & Gemüse
  'Tomaten', 'Gurken', 'Paprika', 'Zwiebeln', 'Salat', 'Karotten', 'Äpfel',
  'Bananen', 'Erdbeeren', 'Trauben', 'Zitronen', 'Avocado',
  // Tiefkühl & Fertiggerichte
  'Pizza', 'Pommes', 'Eis', 'Tiefkühlgemüse', 'Fischstäbchen',
  // Süßes & Snacks
  'Schokolade', 'Kekse', 'Chips', 'Nüsse', 'Gummibärchen', 'Riegel',
  // Getränke
  'Wasser', 'Saft', 'Limonade', 'Cola', 'Bier', 'Wein', 'Sekt',
  // Haushalt & Drogerie
  'Spülmittel', 'Waschmittel', 'Weichspüler', 'Toilettenpapier', 'Küchenrolle',
  'Müllbeutel', 'Zahnpasta', 'Duschgel', 'Shampoo', 'Deo', 'Windeln',
  'Katzenfutter', 'Hundefutter',
]
