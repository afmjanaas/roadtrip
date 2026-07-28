/* ================= PLACE CATEGORIES (auto-tagging) ================= */
export const PLACE_CATS=[
 {k:"restaurant",i:"🍽",l:"Restaurants",ta:"உணவகங்கள்"},
 {k:"viewpoint",i:"🌄",l:"Viewpoints",ta:"காட்சி இடங்கள்"},
 {k:"museum",i:"🏛",l:"Museums",ta:"அருங்காட்சியகங்கள்"},
 {k:"shopping",i:"🛍",l:"Shopping",ta:"கடையடி"},
 {k:"beach",i:"🏖",l:"Beaches",ta:"கடற்கரைகள்"},
 {k:"nature",i:"🌿",l:"Nature",ta:"இயற்கை"},
 {k:"mosque",i:"🕌",l:"Mosques",ta:"மசூதிகள்"},
 {k:"heritage",i:"🏰",l:"Heritage",ta:"பாரம்பரியம்"}];
export function autoCat(p){
 const s=((p.n||"")+" "+(p.why||"")+" "+(p.city||"")).toLowerCase();
 if(/restaurant|dining|caf[eé]|eatery|kitchen|grill|shawarma|biryani|seafood|bakery/.test(s))return "restaurant";
 if(/museum|louvre|gallery|exhibit|heritage village/.test(s))return "museum";
 if(/beach|corniche|waterfront|marina|\bjbr\b|lagoon/.test(s))return "beach";
 if(/souq|mall|market|shopping|gold|spice|dates carnival|carnival/.test(s))return "shopping";
 if(/mountain|jabal|jebel|wadi|park|forest|oasis|valley|desert|cave|sinkhole|dune|garden|farm|falaj|\brock\b|spring|waterfall/.test(s))return "nature";
 if(/mosque|masjid|haram|kaaba|umrah|miqat|rawdah|quba|nabawi/.test(s))return "mosque";
 if(/view|tower|deck|observation|summit|fort|castle|palace|frame|\bsky\b|cable car|clock|point/.test(s))return "viewpoint";
 return "heritage"}
export function effCat(p){return (p.tag&&p.tag!=="")?p.tag:autoCat(p)}
export function catMeta(k){return PLACE_CATS.find(c=>c.k===k)||{k:k,i:"📍",l:k,ta:k}}
