type LocationData = {
  states: string[];
  citiesByState: Record<string, string[]>;
};

const NIGERIA: LocationData = {
  states: [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
    'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
    'Ekiti', 'Enugu', 'Federal Capital Territory', 'Gombe', 'Imo',
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
    'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  ],
  citiesByState: {
    'Abia': ['Umuahia', 'Aba', 'Ohafia', 'Arochukwu', 'Bende'],
    'Adamawa': ['Yola', 'Mubi', 'Numan', 'Ganye', 'Michika'],
    'Akwa Ibom': ['Uyo', 'Eket', 'Ikot Ekpene', 'Oron', 'Abak'],
    'Anambra': ['Awka', 'Onitsha', 'Nnewi', 'Ekwulobia', 'Ihiala'],
    'Bauchi': ['Bauchi', 'Azare', 'Misau', "Jama'are", 'Ningi'],
    'Bayelsa': ['Yenagoa', 'Brass', 'Ogbia', 'Sagbama', 'Ekeremor'],
    'Benue': ['Makurdi', 'Gboko', 'Katsina-Ala', 'Otukpo', 'Zaki-Biam'],
    'Borno': ['Maiduguri', 'Biu', 'Gwoza', 'Monguno', 'Dikwa'],
    'Cross River': ['Calabar', 'Ikom', 'Ogoja', 'Obudu', 'Ugep'],
    'Delta': ['Asaba', 'Warri', 'Sapele', 'Ughelli', 'Agbor'],
    'Ebonyi': ['Abakaliki', 'Afikpo', 'Onueke', 'Ezza', 'Ishiagu'],
    'Edo': ['Benin City', 'Auchi', 'Ekpoma', 'Uromi', 'Ubiaja'],
    'Ekiti': ['Ado-Ekiti', 'Ikere-Ekiti', 'Ijero-Ekiti', 'Oye-Ekiti', 'Efon-Alaaye'],
    'Enugu': ['Enugu', 'Nsukka', 'Oji River', 'Awgu', 'Agbani'],
    'Federal Capital Territory': ['Abuja', 'Gwagwalada', 'Kuje', 'Bwari', 'Kubwa'],
    'Gombe': ['Gombe', 'Deba', 'Billiri', 'Kaltungo', 'Nafada'],
    'Imo': ['Owerri', 'Okigwe', 'Orlu', 'Oguta', 'Mbaise'],
    'Jigawa': ['Dutse', 'Hadejia', 'Gumel', 'Birnin Kudu', 'Kazaure'],
    'Kaduna': ['Kaduna', 'Zaria', 'Kafanchan', 'Kagoro', 'Soba'],
    'Kano': ['Kano', 'Wudil', 'Gwarzo', 'Rano', 'Bichi'],
    'Katsina': ['Katsina', 'Daura', 'Funtua', 'Malumfashi', 'Dutsin-Ma'],
    'Kebbi': ['Birnin Kebbi', 'Argungu', 'Zuru', 'Yauri', 'Kamba'],
    'Kogi': ['Lokoja', 'Okene', 'Idah', 'Kabba', 'Anyigba'],
    'Kwara': ['Ilorin', 'Offa', 'Omu-Aran', 'Lafiagi', 'Jebba'],
    'Lagos': ['Lagos Island', 'Ikeja', 'Lekki', 'Victoria Island', 'Ikorodu', 'Badagry', 'Epe', 'Surulere', 'Yaba', 'Apapa'],
    'Nasarawa': ['Lafia', 'Keffi', 'Akwanga', 'Nasarawa', 'Doma'],
    'Niger': ['Minna', 'Bida', 'Suleja', 'Kontagora', 'Lapai'],
    'Ogun': ['Abeokuta', 'Sagamu', 'Ijebu-Ode', 'Ota', 'Ilaro'],
    'Ondo': ['Akure', 'Owo', 'Ondo', 'Ikare', 'Okitipupa'],
    'Osun': ['Osogbo', 'Ilesa', 'Ede', 'Ile-Ife', 'Ikirun'],
    'Oyo': ['Ibadan', 'Ogbomosho', 'Oyo', 'Iseyin', 'Saki'],
    'Plateau': ['Jos', 'Shendam', 'Pankshin', 'Barkin Ladi', 'Bokkos'],
    'Rivers': ['Port Harcourt', 'Bonny', 'Degema', 'Omoku', 'Ahoada'],
    'Sokoto': ['Sokoto', 'Tambuwal', 'Wurno', 'Gwadabawa', 'Shagari'],
    'Taraba': ['Jalingo', 'Bali', 'Wukari', 'Sardauna', 'Gembu'],
    'Yobe': ['Damaturu', 'Nguru', 'Potiskum', 'Gashua', 'Geidam'],
    'Zamfara': ['Gusau', 'Kaura Namoda', 'Anka', 'Talata-Mafara', 'Zurmi'],
  },
};

const SOUTH_KOREA: LocationData = {
  states: [
    'Seoul', 'Busan', 'Daegu', 'Incheon', 'Gwangju', 'Daejeon',
    'Ulsan', 'Sejong', 'Gyeonggi', 'Gangwon', 'North Chungcheong',
    'South Chungcheong', 'North Jeolla', 'South Jeolla',
    'North Gyeongsang', 'South Gyeongsang', 'Jeju',
  ],
  citiesByState: {
    'Seoul': ['Gangnam', 'Jongno', 'Mapo', 'Yongsan', 'Songpa', 'Seocho', 'Nowon', 'Dongdaemun', 'Seodaemun', 'Gwangjin'],
    'Busan': ['Haeundae', 'Nam-gu', 'Dong-gu', 'Seo-gu', 'Buk-gu', 'Sasang-gu', 'Saha-gu', 'Gijang'],
    'Daegu': ['Jung-gu', 'Nam-gu', 'Suseong-gu', 'Dalseo-gu', 'Dong-gu', 'Buk-gu', 'Seo-gu', 'Dalseong'],
    'Incheon': ['Nam-gu', 'Namdong-gu', 'Bupyeong-gu', 'Yeonsu-gu', 'Dong-gu', 'Jung-gu', 'Ganghwa'],
    'Gwangju': ['Dong-gu', 'Seo-gu', 'Nam-gu', 'Buk-gu', 'Gwangsan-gu'],
    'Daejeon': ['Dong-gu', 'Seo-gu', 'Yuseong-gu', 'Jung-gu', 'Daedeok-gu'],
    'Ulsan': ['Nam-gu', 'Dong-gu', 'Buk-gu', 'Jung-gu', 'Ulju'],
    'Sejong': ['Sejong City'],
    'Gyeonggi': ['Suwon', 'Seongnam', 'Goyang', 'Bucheon', 'Yongin', 'Ansan', 'Hwaseong', 'Anyang', 'Namyangju', 'Pyeongtaek', 'Siheung', 'Uijeongbu', 'Gimpo', 'Paju', 'Hanam', 'Icheon', 'Anseong'],
    'Gangwon': ['Chuncheon', 'Wonju', 'Gangneung', 'Sokcho', 'Donghae', 'Samcheok', 'Taebaek', 'Hongcheon', 'Pyeongchang'],
    'North Chungcheong': ['Cheongju', 'Chungju', 'Jecheon', 'Boeun', 'Yeongdong', 'Jincheon', 'Eumseong'],
    'South Chungcheong': ['Cheonan', 'Gongju', 'Boryeong', 'Asan', 'Seosan', 'Nonsan', 'Dangjin', 'Yesan', 'Hongseong'],
    'North Jeolla': ['Jeonju', 'Iksan', 'Gunsan', 'Namwon', 'Gimje', 'Gochang', 'Buan'],
    'South Jeolla': ['Yeosu', 'Suncheon', 'Naju', 'Gwangyang', 'Mokpo', 'Damyang', 'Boseong', 'Haenam'],
    'North Gyeongsang': ['Pohang', 'Gumi', 'Gyeongju', 'Andong', 'Yeongju', 'Gimcheon', 'Gyeongsan', 'Yeongcheon', 'Mungyeong'],
    'South Gyeongsang': ['Changwon', 'Jinju', 'Tongyeong', 'Sacheon', 'Gimhae', 'Geoje', 'Yangsan', 'Miryang', 'Hadong', 'Namhae'],
    'Jeju': ['Jeju City', 'Seogwipo'],
  },
};

export const LOCATION_DATA: Record<string, LocationData> = {
  Nigeria: NIGERIA,
  SK: SOUTH_KOREA,
};

// value = what the backend expects; label = what users see
export const STAFF_COUNTRIES = [
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'SK', label: 'South Korea' },
] as const;

// Maps API country codes back to human-readable names for display
export const COUNTRY_LABELS: Record<string, string> = {
  SK: 'South Korea',
  Nigeria: 'Nigeria',
};

export const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Friend',
  'Colleague',
  'Manager',
  'Guardian',
  'Other',
] as const;

export function getStates(country: string): string[] {
  return LOCATION_DATA[country]?.states ?? [];
}

export function getCities(country: string, state: string): string[] {
  return LOCATION_DATA[country]?.citiesByState[state] ?? [];
}
