/* ================= SHARED BUDGET / EXPENSE MATH ================= */
export const EXCATS=[
 {k:"fuel",i:"⛽"},{k:"food",i:"🍽"},{k:"hotel",i:"🏨"},{k:"tickets",i:"🎟"},
 {k:"parking",i:"🅿"},{k:"shopping",i:"🛍"},{k:"pretrip",i:"🛂"},{k:"other",i:"✨"}];
export const CATLBL={fuel:"catFuel",food:"catFood",hotel:"catHotel",tickets:"catTickets",parking:"catParking",shopping:"catShopping",pretrip:"catPretrip",other:"catOther"};

export const Q=(trip,cur,v)=>(v||0)*((trip.fx&&trip.fx[cur])!=null?trip.fx[cur]:1);

export function placesOfDay(places,ord){return places.filter(p=>p.dayOrd===ord)}
export function dayActs(trip,places,ord){return placesOfDay(places,ord).filter(p=>p.on).reduce((s,p)=>s+Q(trip,p.cur,p.fam),0)}
export function dayPlanned(trip,places,d){
 return Q(trip,d.hCur||trip.currency,d.hV)+(d.fuelQ||0)+(d.foodQ||0)+(d.parkQ||0)+(d.miscQ||0)+dayActs(trip,places,d.ord)}
export function dayPlannedCats(trip,places,d){return{
 hotel:Q(trip,d.hCur||trip.currency,d.hV),fuel:d.fuelQ||0,food:d.foodQ||0,
 parking:d.parkQ||0,tickets:dayActs(trip,places,d.ord),other:d.miscQ||0,shopping:0}}
export function preTotal(trip){return (trip.pretrip||[]).reduce((s,p)=>s+(p.v||0),0)}
export function plannedTotal(trip,days,places){return days.reduce((s,d)=>s+dayPlanned(trip,places,d),0)+preTotal(trip)}

export function expHome(trip,e){return e.amtHome!=null?e.amtHome:Q(trip,e.cur,e.amt)}
export function spentTotal(trip,exps){return exps.reduce((s,e)=>s+expHome(trip,e),0)}
export function spentByDay(trip,exps){const m={};exps.forEach(e=>{const k=e.dayOrd||0;m[k]=(m[k]||0)+expHome(trip,e)});return m}
export function spentByCat(trip,exps){const m={};exps.forEach(e=>{m[e.cat||"other"]=(m[e.cat||"other"]||0)+expHome(trip,e)});return m}
export function dayOrdForDate(days,iso){const d=days.find(x=>x.date===iso);return d?d.ord:0}
