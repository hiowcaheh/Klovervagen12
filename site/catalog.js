// Catalog of point types for the installation planner.
// Generic content only: no data about any specific house.

var CATS = [
  { id: "light", name: "Światło 230 V", css: "--c-light" },
  { id: "led", name: "LED 24 V", css: "--c-led" },
  { id: "window", name: "Okna i rolety", css: "--c-blind" },
  { id: "power", name: "Gniazda i zasilanie", css: "--c-power" },
  { id: "security", name: "Kamery i zamki", css: "--c-cam" },
  { id: "sensor", name: "Czujniki", css: "--c-sensor" },
  { id: "climate", name: "Klimat", css: "--c-climate" },
  { id: "net", name: "Apple i Wi-Fi", css: "--c-wifi" },
  { id: "audio", name: "Audio i TV", css: "--c-audio" },
  { id: "garden", name: "Ogród i garaż", css: "--c-garden" }
];

var PSU = [[60, 450], [100, 650], [150, 800], [240, 1100], [320, 1400]];
function psuFor(watts) {
  var need = watts * 1.25;
  for (var i = 0; i < PSU.length; i++) { if (need <= PSU[i][0]) return { count: 1, w: PSU[i][0], price: PSU[i][1] }; }
  var c = Math.ceil(need / 320);
  return { count: c, w: 320, price: 1400 };
}
function psuItem(watts) { var p = psuFor(watts); return ["Zasilacz LED 24 V " + p.w + " W z wejściem 0-10V", p.count, p.price]; }

var T = {
  lamp: { cat: "light", p: "L", name: "Lampa sufitowa lub kinkiet", what: "Włączanie i wyłączanie z Hem, Siri i automatyzacji.", device: "Shelly 1PM Gen4 (Matter) w puszce za zwykłym włącznikiem. Dwa obwody w jednym miejscu: Shelly 2PM Gen4.", needs: ["Przewód neutralny (N) w puszce włącznika", "Głęboka puszka"], tips: ["Włącznik zostaje zwykły i działa także bez Wi-Fi.", "Chcesz ściemniać? Wybierz typ „Lampa ściemniana”."], apple: "Światło w Hem.", who: "Elektryk", qtyLabel: "Obwody w tym miejscu", def: 1,
    items: function (p) { return p.qty >= 2 ? [["Shelly 2PM Gen4", Math.ceil(p.qty / 2), 450]] : [["Shelly 1PM Gen4", 1, 300]]; },
    sv: "Nolla (N) och djup apparatdosa vid strömbrytaren för Shelly ({c})." },
  dim: { cat: "light", p: "LD", name: "Lampa ściemniana lub spoty 230 V", what: "Płynne ściemnianie z Hem i Siri.", device: "Shelly Dimmer Gen4 (Matter) w puszce za włącznikiem.", needs: ["N i głęboka puszka przy włączniku", "Ściemnialne oprawy lub żarówki (oznaczenie „dimbar”)"], tips: ["„Ilość” to liczba spotów na obwodzie, do zamówienia opraw.", "Sprawdź maksymalną moc ściemniacza w instrukcji."], apple: "Ściemniane światło w Hem.", who: "Elektryk", qtyLabel: "Liczba opraw (informacyjnie)", def: 1,
    items: function () { return [["Shelly Dimmer Gen4", 1, 550]]; },
    sv: "Nolla (N) och djup apparatdosa för Shelly Dimmer Gen4, dimbara armaturer ({c})." },
  stairs: { cat: "light", p: "LS", name: "Oświetlenie schodów", what: "Lampki w ścianie przy stopniach, włączane ruchem nocą.", device: "Lampki 230 V w ścianie na Shelly 1PM Gen4 i dwa czujniki ruchu (góra, dół).", needs: ["Puszki na lampki przy stopniach, np. co drugi stopień", "Przewody do wspólnej puszki ze Shelly"], tips: ["Automatyzacja: ruch między 22 a 6 → lampki na 2 minuty."], apple: "Światło i czujniki ruchu w Hem.", who: "Elektryk", def: 1,
    items: function () { return [["Shelly 1PM Gen4", 1, 300], ["IKEA MYGGSPRAY (czujnik ruchu)", 2, 150]]; },
    sv: "Infällda dosor för trappbelysning vid trappstegen, kablar till gemensam dosa med Shelly ({c})." },
  outlamp: { cat: "light", p: "LZ", name: "Lampa zewnętrzna", what: "Lampy na elewacji, przy wejściu, na tarasie.", device: "Shelly 1PM Gen4 w puszce wewnątrz domu, lampa IP44 lub wyżej.", needs: ["Przewód do lampy na elewacji", "Puszka na Shelly w suchym miejscu wewnątrz"], tips: ["Automatyzacja: włącz o zachodzie słońca, wyłącz o 23:00."], apple: "Światło w Hem.", who: "Elektryk", def: 1,
    items: function () { return [["Shelly 1PM Gen4", 1, 300]]; },
    sv: "Utomhusbelysning på fasaden, styrd från dosa inomhus med Shelly ({c})." },

  cove: { cat: "led", p: "LC", name: "LED w uskoku sufitu", what: "Ściemniana linia światła w podwieszanym suficie lub wnęce.", device: "Taśma LED 24 V + zasilacz z wejściem 0-10V (np. Mean Well PWM) + Shelly Dimmer 0/1-10V PM Gen4 (Matter).", needs: ["Przewód 230 V do miejsca zasilacza (elektryk)", "Zasilacz w dostępnym, przewiewnym miejscu: klapka rewizyjna, nigdy na stałe w suficie", "Przewód 24 V 2×1,5 mm² od zasilacza do taśmy", "Przewód sterujący 0-10V od Shelly do zasilacza", "Puszka na Shelly przy włączniku"], tips: ["Taśma COB, CRI ≥ 90, 2700–3000 K: równa, ciepła linia bez kropek.", "Profil aluminiowy z mlecznym kloszem chłodzi taśmę i rozprasza światło.", "Inne sterowanie: Shelly Plus RGBW PM (4 kanały z jednego zasilacza, także CCT; Matter sprawdzimy w aktualnym firmware) albo Shelly Dimmer Gen4 + zasilacz ściemnialny TRIAC (prościej, ale może migotać przy niskiej jasności)."], apple: "Ściemniane światło w Hem.", who: "Elektryk + Ty", unit: "m", wpm: 10, def: 4,
    items: function (p) { return [["Taśma LED 24 V COB + profil (m)", p.len, 200], psuItem(p.len * 10), ["Shelly Dimmer 0/1-10V PM Gen4", 1, 400]]; },
    sv: "Indirekt LED-belysning 24 V i nedsänkt tak: 230 V till LED-drivare 24 V med 0-10V placerad åtkomligt, styrkabel 0-10V till dosa för Shelly Dimmer 0/1-10V vid brytaren ({c})." },
  winled: { cat: "led", p: "LO", name: "Lampka LED w ościeżnicy okna", what: "Małe światło w górnej części ościeżnicy każdego okna, automatycznie wieczorem.", device: "Profil LED lub mini-spot 24 V w nadprożu. Jeden zasilacz i jeden sterownik na grupę okien.", needs: ["Przewód 24 V (2×0,75–1,5 mm²) z każdego okna do zasilacza grupy", "Przewód 230 V do zasilacza (elektryk)", "Dostęp do zasilacza (rewizja)"], tips: ["Grupa = okna, które świecą razem (np. Front, Salon). Każda grupa to jeden kanał sterowania.", "Pewna droga do Hem: Shelly Dimmer 0/1-10V Gen4 + zasilacz 0-10V na grupę. Shelly Plus RGBW PM daje 4 kanały z jednego zasilacza (Matter sprawdzimy w aktualnym firmware).", "Automatyzacja: zachód słońca → włącz, 23:00 → wyłącz. Działa też jako symulacja obecności podczas wyjazdu.", "Tańsza alternatywa: typ „Gniazdo nad oknem” i zwykłe lampy okienne."], apple: "Jedno światło na grupę w Hem.", who: "Elektryk + Ty", grouped: true, groupLabel: "Grupa (np. Front, Salon)", qtyLabel: "Liczba okien w tym punkcie", def: 1,
    items: function (p) { return [["Lampka lub profil LED 24 V do ościeżnicy", p.qty, 250]]; },
    groupItems: function (pts) { var n = 0; pts.forEach(function (p) { n += p.qty; }); return [psuItem(n * 5), ["Shelly Dimmer 0/1-10V PM Gen4", 1, 400]]; },
    sv: "Fönsterbelysning: kabel 24 V från varje fönsternisch till gemensam LED-drivare per grupp, 230 V till drivaren ({c})." },
  cabinet: { cat: "led", p: "LK", name: "LED pod szafkami", what: "Oświetlenie blatu w kuchni.", device: "Profil LED 24 V + zasilacz 0-10V + Shelly Dimmer 0/1-10V Gen4 (albo Shelly 1PM bez ściemniania).", needs: ["Przewód 230 V do zasilacza w szafce", "Przewód 24 V do profili"], tips: ["Zasilacz w szafce, z dostępem."], apple: "Światło w Hem.", who: "Elektryk + Ty", unit: "m", wpm: 8, def: 2,
    items: function (p) { return [["Profil LED 24 V pod szafki (m)", p.len, 200], psuItem(p.len * 8), ["Shelly Dimmer 0/1-10V PM Gen4", 1, 400]]; },
    sv: "230 V till LED-drivare i köksskåp, 24 V till bänkbelysning, dosa för Shelly ({c})." },
  night: { cat: "led", p: "LN", name: "LED nocne (cokół, korytarz)", what: "Delikatne światło przy podłodze, włączane ruchem w nocy.", device: "Taśma LED 24 V w cokole lub listwie + zasilacz + Shelly + czujnik ruchu.", needs: ["Przewód 230 V do zasilacza", "Kanał w cokole lub listwie na taśmę"], tips: ["Automatyzacja: ruch między 23 a 6 → 10% jasności na 2 minuty."], apple: "Światło i czujnik ruchu w Hem.", who: "Elektryk + Ty", unit: "m", wpm: 5, def: 3,
    items: function (p) { return [["Taśma LED 24 V (m)", p.len, 120], psuItem(p.len * 5), ["Shelly Dimmer 0/1-10V PM Gen4", 1, 400], ["IKEA MYGGSPRAY (czujnik ruchu)", 1, 150]]; },
    sv: "LED 24 V i sockel eller golvlist, 230 V till drivare, dosa för Shelly ({c})." },

  winout: { cat: "window", p: "GO", name: "Gniazdo nad oknem (lampa okienna)", what: "Szwedzkie „fönsteruttag”: wkładasz dowolną lampę okienną, a Hem włącza wszystkie naraz.", device: "Gniazdo 230 V przy lub nad oknem; gniazda grupy na jednym obwodzie ze Shelly 1PM Gen4.", needs: ["Gniazdo w nadprożu, ościeżnicy lub przy parapecie", "Obwód gniazd okiennych przez jedną puszkę ze Shelly"], tips: ["Najtańszy sposób na automatyczne lampy w oknach.", "Automatyzacja: zachód słońca → włącz, 23:00 → wyłącz."], apple: "Jedno światło na grupę w Hem.", who: "Elektryk", grouped: true, groupLabel: "Grupa (np. Cały dom)", qtyLabel: "Liczba gniazd w tym punkcie", def: 1,
    items: function (p) { return [["Gniazdo okienne (materiał)", p.qty, 150]]; },
    groupItems: function () { return [["Shelly 1PM Gen4", 1, 300]]; },
    sv: "Fönsteruttag vid eller ovanför fönstren, kopplade till en gemensam grupp styrd av Shelly 1PM ({c})." },
  blind: { cat: "window", p: "R", name: "Roleta lub żaluzja z napędem 230 V", what: "Otwieranie i zamykanie z Hem, o zachodzie słońca automatycznie.", device: "Napęd 230 V + Shelly 2PM Gen4 w trybie rolety.", needs: ["Przewód do okna (5G1,5)", "Puszka na Shelly przy oknie lub włączniku"], tips: ["Przed zakupem sprawdzimy, czy tryb rolety Shelly działa w Hem przez Matter.", "Cena napędu i rolety zależy od okna; liczę tylko sterownik."], apple: "Roleta w Hem.", who: "Elektryk", def: 1,
    items: function () { return [["Shelly 2PM Gen4", 1, 450]]; },
    sv: "Kabel 5G1,5 till fönstret för motoriserad rullgardin eller markis, dosa för Shelly 2PM ({c})." },
  blindbat: { cat: "window", p: "RB", name: "Roleta na baterię (bez kabli)", what: "Gdy nie chcesz kłaść kabli do okna.", device: "Rolety IKEA na baterię przez bramkę IKEA DIRIGERA (Matter).", needs: ["Nic w ścianie, wystarczy wymiar okna"], tips: ["Bramka DIRIGERA jest potrzebna raz na cały dom."], apple: "Roleta w Hem.", who: "Ty", def: 1,
    items: function () { return [["Roleta IKEA z napędem", 1, 1800]]; },
    globalItems: [["IKEA DIRIGERA (bramka)", 1, 800]] },

  outlet: { cat: "power", p: "G", name: "Gniazdo sterowane", what: "Lampa stojąca, choinka, ekspres: włączane z Hem.", device: "Shelly 1PM Gen4 w głębokiej puszce za gniazdem.", needs: ["Głęboka puszka za gniazdem"], tips: ["Bez remontu: wtyczka IKEA z Matter do zwykłego gniazda."], apple: "Gniazdo w Hem.", who: "Elektryk", def: 1,
    items: function () { return [["Shelly 1PM Gen4", 1, 300]]; },
    sv: "Djup dosa bakom uttaget för Shelly 1PM ({c})." },
  outout: { cat: "power", p: "GZ", name: "Gniazdo zewnętrzne sterowane", what: "Lampki na tarasie, choinka w ogrodzie, pompa.", device: "Gniazdo IP44 z wyłącznikiem różnicowoprądowym, Shelly 1PM Gen4 w puszce wewnątrz.", needs: ["Osobny obwód z wyłącznikiem różnicowoprądowym", "Puszka na Shelly wewnątrz"], tips: [], apple: "Gniazdo w Hem.", who: "Elektryk", def: 1,
    items: function () { return [["Shelly 1PM Gen4", 1, 300]]; },
    sv: "Utomhusuttag IP44 med jordfelsbrytare, styrt via Shelly i dosa inomhus ({c})." },
  tv: { cat: "audio", p: "TV", name: "Ściana TV", what: "Miejsce na telewizor i soundbar.", device: "4 gniazda, rura na HDMI, opcjonalnie gniazdo Ethernet.", needs: ["4 gniazda 230 V", "Rura osłonowa na kabel HDMI do soundbara lub konsoli"], tips: ["Soundbar dodaj osobno jako „Głośnik Sonos”."], apple: "Apple TV i Sonos pojawiają się w Hem.", who: "Elektryk", def: 1,
    items: function () { return []; },
    sv: "TV-vägg: 4 uttag, tomrör för HDMI, eventuellt nätverksuttag ({c})." },
  ev: { cat: "power", p: "EV", name: "Ładowarka samochodu", what: "Ładowanie auta w garażu.", device: "Ładowarka 11 kW na osobnym obwodzie 3-fazowym 16 A.", needs: ["Osobny obwód 3-fazowy 16 A", "Wyłącznik różnicowoprądowy typu B lub ładowarka z detekcją DC"], tips: ["Ulga grön teknik: 50% na ładowarkę z montażem."], apple: "Zwykle przez aplikację producenta.", who: "Elektryk", def: 1,
    items: function () { return [["Ładowarka z montażem (przed ulgą)", 1, 20000]]; },
    sv: "Separat 3-fasgrupp 16 A till laddbox, jordfelsbrytare typ B eller laddbox med DC-detektering ({c})." },
  ipad: { cat: "net", p: "P", name: "Panel iPad w ścianie", what: "Stały ekran z aplikacją Hem, np. w kuchni.", device: "iPad z ekranem LCD w uchwycie ściennym, gniazdo za panelem.", needs: ["Gniazdo 230 V za panelem", "Wnęka z cyrkulacją powietrza"], tips: ["Apple ma podobno wypuścić własny ekran ścienny. Z zakupem iPada można poczekać."], apple: "Aplikacja Hem na pełnym ekranie.", who: "Elektryk + Ty", def: 1,
    items: function () { return [["iPad + uchwyt ścienny", 1, 6000]]; },
    sv: "Uttag bakom väggpanelen för iPad ({c})." },

  cam: { cat: "security", p: "K", name: "Kamera zewnętrzna (Aqara G5 Pro)", what: "Nagrywanie do iCloud, powiadomienia o osobach i autach.", device: "Aqara Camera Hub G5 Pro (Wi-Fi), HomeKit Secure Video.", needs: ["Zasilanie pod okapem: zewnętrzna puszka na zasilacz USB-C 5 V (albo kabel sieciowy dla wersji PoE)"], tips: ["Kieruj na własną posesję, nie na ulicę i sąsiadów.", "Kamery na baterie nie obsługują HomeKit Secure Video."], apple: "Kamera z nagraniami w Hem.", who: "Elektryk", def: 1, camera: true,
    items: function () { return [["Aqara Camera Hub G5 Pro", 1, 2300]]; },
    sv: "Strömförsörjning under takfoten för kamera, utomhusdosa för 5 V-adapter ({c})." },
  camlight: { cat: "security", p: "KL", name: "Kamera z lampą (Eve Outdoor Cam)", what: "Zastępuje lampę zewnętrzną: światło i kamera w jednym.", device: "Eve Outdoor Cam, HomeKit Secure Video, tylko Apple Home.", needs: ["Puszka 230 V na elewacji, jak pod lampę"], tips: ["Lampa świeci w tym samym kierunku, w którym patrzy kamera."], apple: "Kamera i światło w Hem.", who: "Elektryk", def: 1, camera: true,
    items: function () { return [["Eve Outdoor Cam", 1, 2600]]; },
    sv: "Kopplingsdosa 230 V på fasaden för kamera med inbyggd belysning ({c})." },
  bell: { cat: "security", p: "D", name: "Dzwonek z kamerą (Aqara G410)", what: "Widzisz, kto dzwoni, gong w środku.", device: "Aqara Doorbell G410, HomeKit Secure Video.", needs: ["Transformator dzwonkowy 12–24 V i przewód do dzwonka (albo baterie AA)"], tips: [], apple: "Dzwonek z obrazem w Hem.", who: "Elektryk", def: 1, camera: true,
    items: function () { return [["Aqara Doorbell G410", 1, 1700]]; },
    sv: "Ringklockstransformator 12–24 V och kabel till dörrklockan ({c})." },
  lock: { cat: "security", p: "ZM", name: "Zamek inteligentny", what: "Otwieranie drzwi telefonem i automatyczne zamykanie.", device: "Zamek z Matter (np. Aqara, Nuki). Model dobierzemy do Twojej wkładki.", needs: ["Wymiary i typ obecnego zamka"], tips: ["W szwedzkich drzwiach często są zamki ASSA: przed zakupem sprawdzimy zgodność."], apple: "Zamek w Hem.", who: "Ty", def: 1,
    items: function () { return [["Zamek inteligentny", 1, 3000]]; } },

  contact: { cat: "sensor", p: "CD", name: "Czujnik drzwi lub okna", what: "Powiadomienie, gdy coś się otworzy.", device: "IKEA MYGGBETT (Matter przez Thread, na baterię).", needs: ["Nic, przyklejasz sam"], tips: [], apple: "Czujnik w Hem.", who: "Ty", def: 1,
    items: function () { return [["IKEA MYGGBETT", 1, 100]]; } },
  motion: { cat: "sensor", p: "CR", name: "Czujnik ruchu", what: "Włącza światło, gdy ktoś przechodzi.", device: "IKEA MYGGSPRAY (Matter przez Thread, na baterię).", needs: ["Nic, montujesz sam"], tips: [], apple: "Czujnik w Hem.", who: "Ty", def: 1,
    items: function () { return [["IKEA MYGGSPRAY", 1, 150]]; } },
  leak: { cat: "sensor", p: "CZ", name: "Czujnik zalania", what: "Alarm i powiadomienie, gdy pojawi się woda.", device: "IKEA KLIPPBOK (Matter przez Thread, na baterię).", needs: ["Nic, kładziesz na podłodze"], tips: ["Pod zlewem, przy pralce, w kotłowni, w łazience."], apple: "Czujnik w Hem.", who: "Ty", def: 1,
    items: function () { return [["IKEA KLIPPBOK", 1, 100]]; } },
  temp: { cat: "sensor", p: "CT", name: "Czujnik temperatury i wilgotności", what: "Temperatura i wilgotność w pomieszczeniu, wyzwalacz automatyzacji.", device: "Czujnik z Matter (np. Eve, Aqara).", needs: ["Nic, stawiasz sam"], tips: [], apple: "Czujnik w Hem.", who: "Ty", def: 1,
    items: function () { return [["Czujnik temperatury i wilgotności", 1, 400]]; } },

  fan: { cat: "climate", p: "WL", name: "Wentylator łazienkowy", what: "Włącza się sam, gdy rośnie wilgotność.", device: "Shelly 1PM Gen4 + czujnik wilgotności (Matter).", needs: ["Puszka na Shelly przy włączniku lub wentylatorze"], tips: ["Automatyzacja: wilgotność powyżej 70% → wentylator do spadku."], apple: "Wentylator i czujnik w Hem.", who: "Elektryk", def: 1,
    items: function () { return [["Shelly 1PM Gen4", 1, 300], ["Czujnik temperatury i wilgotności", 1, 400]]; },
    sv: "Dosa för Shelly 1PM till badrumsfläkten ({c})." },
  floor: { cat: "climate", p: "OP", name: "Ogrzewanie podłogowe (termostat)", what: "Temperatura podłogi z Hem i harmonogram.", device: "Termostat z czujnikiem podłogi i Matter. Model dobierzemy do Twojego systemu.", needs: ["Rurka na czujnik podłogi", "Puszka według wymagań producenta"], tips: [], apple: "Termostat w Hem.", who: "Elektryk", def: 1,
    items: function () { return [["Termostat z czujnikiem podłogi (Matter)", 1, 1200]]; },
    sv: "Termostat med golvgivare, dosa och givarrör enligt tillverkarens krav ({c})." },

  hub: { cat: "net", p: "H", name: "HomePod mini 2 (centrum)", what: "Centrum domu: zdalny dostęp, automatyzacje, nagrania kamer, sieć Thread.", device: "HomePod mini 2 (1 895 kr, w sprzedaży od 30.10.2026).", needs: ["Gniazdo"], tips: ["Postaw centralnie, np. w kuchni."], apple: "Centrum domu (hemnav).", who: "Ty", def: 1,
    items: function () { return [["HomePod mini 2", 1, 1895]]; } },
  atv: { cat: "net", p: "AT", name: "Apple TV 4K", what: "Drugie centrum domu i zapas dla sieci Thread.", device: "Apple TV 4K z gniazdem Ethernet.", needs: ["Gniazdo, najlepiej też Ethernet"], tips: ["Tylko model z Ethernetem ma Thread."], apple: "Centrum domu (hemnav).", who: "Ty", def: 1,
    items: function () { return [["Apple TV 4K z Ethernetem", 1, 2200]]; } },
  mesh: { cat: "net", p: "WF", name: "Punkt Wi-Fi (mesh)", what: "Zasięg Wi-Fi w całym domu i przy elewacji.", device: "Węzeł systemu mesh.", needs: ["Gniazdo", "Opcjonalnie kabel sieciowy do routera"], tips: ["Na każdym piętrze przynajmniej jeden."], apple: "Nie pojawia się w Hem.", who: "Ty", def: 1,
    items: function () { return [["Węzeł Wi-Fi mesh", 1, 1200]]; } },
  eth: { cat: "net", p: "E", name: "Gniazdo Ethernet", what: "Kabel do telewizora, komputera albo punktu Wi-Fi.", device: "Gniazdo i kabel Cat6 do routera.", needs: ["Kabel Cat6 do routera"], tips: ["Kable sieciowe możesz położyć sam."], apple: "Nie pojawia się w Hem.", who: "Ty", def: 1,
    items: function () { return [["Gniazdo Ethernet + kabel Cat6", 1, 150]]; },
    sv: "Nätverksuttag Cat6 med kabel till routern ({c})." },

  spk: { cat: "audio", p: "S", name: "Głośnik w suficie (Sonos Amp)", what: "Niewidoczne głośniki, muzyka ze Spotify i AirPlay.", device: "Głośniki sufitowe (np. Sonos by Sonance) i Sonos Amp na strefę.", needs: ["Kabel głośnikowy 2×1,5 mm² do miejsca wzmacniacza", "Puszka montażowa w suficie"], tips: ["Strefa = pomieszczenie. Każda strefa potrzebuje jednego Sonos Amp."], apple: "Sonos przez AirPlay w Hem.", who: "Elektryk + Ty", grouped: true, groupLabel: "Strefa (np. Kuchnia)", qtyLabel: "Liczba głośników", def: 1,
    items: function (p) { return [["Głośnik sufitowy", p.qty, 3500]]; },
    groupItems: function () { return [["Sonos Amp", 1, 9000]]; },
    sv: "Högtalarkabel 2×1,5 mm² från takhögtalare till förstärkarens plats, monteringsdosa i taket ({c})." },
  sonos: { cat: "audio", p: "SN", name: "Głośnik Sonos", what: "Wolnostojący głośnik albo soundbar.", device: "Sonos Era 100 (ok. 2 800 kr) albo soundbar (ok. 5 500–11 000 kr).", needs: ["Gniazdo"], tips: ["W Hem przez AirPlay."], apple: "Głośnik AirPlay w Hem.", who: "Ty", def: 1,
    items: function () { return [["Głośnik Sonos", 1, 3000]]; } },

  garden: { cat: "garden", p: "OG", name: "Oświetlenie ogrodu", what: "Lampy przy ścieżkach i roślinach, wieczorem automatycznie.", device: "Lampy niskonapięciowe, zasilacz w budynku, Shelly 1PM Gen4.", needs: ["Rura osłonowa i kabel ziemny", "Zasilacz w budynku"], tips: [], apple: "Światło w Hem.", who: "Elektryk + Ty", def: 1,
    items: function () { return [["Shelly 1PM Gen4", 1, 300], ["Zasilacz oświetlenia ogrodu", 1, 500]]; },
    sv: "Tomrör och markkabel till trädgårdsbelysning, matning från dosa inomhus med Shelly ({c})." },
  water: { cat: "garden", p: "NW", name: "Nawadnianie", what: "Podlewanie według harmonogramu.", device: "Eve Aqua na kranie zewnętrznym (bez kabli).", needs: ["Kran zewnętrzny"], tips: [], apple: "Zawór w Hem.", who: "Ty", def: 1,
    items: function () { return [["Eve Aqua", 1, 1100]]; } },
  gate: { cat: "garden", p: "B", name: "Brama garażowa", what: "Otwieranie bramy z Hem i podgląd, czy jest zamknięta.", device: "Shelly 1 Gen4 jako przycisk + czujnik otwarcia.", needs: ["Gniazdo w suficie garażu pod napęd", "Przewód do sterowania napędem"], tips: [], apple: "Brama w Hem.", who: "Elektryk", def: 1,
    items: function () { return [["Shelly 1 Gen4 + czujnik otwarcia", 1, 400]]; },
    sv: "Uttag i garagetaket för portautomatik och kabel till styrningen ({c})." },
  conduit: { cat: "garden", p: "RO", name: "Rura osłonowa na zapas", what: "Pusta rura z pilotem na przyszłe kable.", device: "Rura osłonowa z pilotem.", needs: [], tips: ["Najtańsze ubezpieczenie na przyszłość."], apple: "—", who: "Elektryk lub Ty", unit: "m", def: 10,
    items: function (p) { return [["Rura osłonowa z pilotem (m)", p.len, 20]]; },
    sv: "Tomrör med dragtråd ({c})." }
};
Object.keys(T).forEach(function (k) { T[k].id = k; });

export { CATS, T, psuFor, psuItem };
