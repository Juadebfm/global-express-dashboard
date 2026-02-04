import type {
  ShipmentsDashboardData,
  ShipmentMode,
  ShipmentPriority,
  ShipmentRecord,
  ShipmentStatus,
} from '@/types';

export interface RawShipmentPackage {
  trackingNumber: string;
  weight: string;
}

export interface RawShipment {
  sku: string;
  customer: string;
  origin: string;
  destination: string;
  departure: string;
  eta: string;
  status: string;
  type: string;
  priority: string;
  packages: RawShipmentPackage[];
}

export const rawShipments: RawShipment[] = [
  {
    sku: 'GBX-2025-0715-K8M',
    customer: 'Samsung Electronics Co.',
    origin: 'South Korea',
    destination: 'USA',
    departure: 'Jul. 15, 2025',
    eta: 'Jul. 17, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Express',
    packages: [{ trackingNumber: 'GBX-2025-0715-K8M', weight: '25kg' }],
  },
  {
    sku: 'GBX-2025-0822-N3P',
    customer: 'Dangote Group',
    origin: 'Nigeria',
    destination: 'United Kingdom',
    departure: 'Aug. 22, 2025',
    eta: 'Sep. 21, 2025',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2025-0822-N3P', weight: '1200kg' },
      { trackingNumber: 'GBX-2025-0822-N3Q', weight: '980kg' },
    ],
  },
  {
    sku: 'GBX-2025-0903-C7R',
    customer: 'Alibaba Group',
    origin: 'China',
    destination: 'Nigeria',
    departure: 'Sep. 03, 2025',
    eta: 'Oct. 03, 2025',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2025-0903-C7R', weight: '450kg' },
      { trackingNumber: 'GBX-2025-0903-C7S', weight: '520kg' },
      { trackingNumber: 'GBX-2025-0903-C7T', weight: '380kg' },
    ],
  },
  {
    sku: 'GBX-2025-0918-T2V',
    customer: 'TSMC (Taiwan Semiconductor)',
    origin: 'Taiwan',
    destination: 'USA',
    departure: 'Sep. 18, 2025',
    eta: 'Sep. 20, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Express',
    packages: [{ trackingNumber: 'GBX-2025-0918-T2V', weight: '15kg' }],
  },
  {
    sku: 'GBX-2025-1005-U4W',
    customer: 'Tesla Inc.',
    origin: 'USA',
    destination: 'China',
    departure: 'Oct. 05, 2025',
    eta: 'Oct. 07, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2025-1005-U4W', weight: '35kg' },
      { trackingNumber: 'GBX-2025-1005-U4X', weight: '28kg' },
    ],
  },
  {
    sku: 'GBX-2025-1012-K6Y',
    customer: 'LG Display',
    origin: 'South Korea',
    destination: 'United Kingdom',
    departure: 'Oct. 12, 2025',
    eta: 'Nov. 11, 2025',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2025-1012-K6Y', weight: '850kg' }],
  },
  {
    sku: 'GBX-2025-1028-N8Z',
    customer: 'Nollywood Studios Ltd',
    origin: 'Nigeria',
    destination: 'USA',
    departure: 'Oct. 28, 2025',
    eta: 'Oct. 30, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Express',
    packages: [
      { trackingNumber: 'GBX-2025-1028-N8Z', weight: '12kg' },
      { trackingNumber: 'GBX-2025-1028-N9A', weight: '8kg' },
      { trackingNumber: 'GBX-2025-1028-N9B', weight: '10kg' },
    ],
  },
  {
    sku: 'GBX-2025-1104-C1D',
    customer: 'Huawei Technologies',
    origin: 'China',
    destination: 'South Korea',
    departure: 'Nov. 04, 2025',
    eta: 'Nov. 11, 2025',
    status: 'Delivered',
    type: 'Road',
    priority: 'Economy',
    packages: [{ trackingNumber: 'GBX-2025-1104-C1D', weight: '125kg' }],
  },
  {
    sku: 'GBX-2025-1119-T3E',
    customer: 'Foxconn Technology Group',
    origin: 'Taiwan',
    destination: 'Nigeria',
    departure: 'Nov. 19, 2025',
    eta: 'Dec. 19, 2025',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2025-1119-T3E', weight: '620kg' },
      { trackingNumber: 'GBX-2025-1119-T3F', weight: '580kg' },
    ],
  },
  {
    sku: 'GBX-2025-1127-U5G',
    customer: 'BP International',
    origin: 'United Kingdom',
    destination: 'Nigeria',
    departure: 'Nov. 27, 2025',
    eta: 'Dec. 27, 2025',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2025-1127-U5G', weight: '1450kg' },
      { trackingNumber: 'GBX-2025-1127-U5H', weight: '1380kg' },
      { trackingNumber: 'GBX-2025-1127-U5I', weight: '1520kg' },
    ],
  },
  {
    sku: 'GBX-2025-1203-K7J',
    customer: 'Hyundai Motor Company',
    origin: 'South Korea',
    destination: 'USA',
    departure: 'Dec. 03, 2025',
    eta: 'Jan. 02, 2026',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2025-1203-K7J', weight: '2100kg' },
      { trackingNumber: 'GBX-2025-1203-K7K', weight: '2050kg' },
    ],
  },
  {
    sku: 'GBX-2025-1215-N9L',
    customer: 'MTN Nigeria',
    origin: 'Nigeria',
    destination: 'China',
    departure: 'Dec. 15, 2025',
    eta: 'Dec. 17, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2025-1215-N9L', weight: '42kg' }],
  },
  {
    sku: 'GBX-2025-1222-C2M',
    customer: 'BYD Company Limited',
    origin: 'China',
    destination: 'United Kingdom',
    departure: 'Dec. 22, 2025',
    eta: 'Jan. 21, 2026',
    status: 'In transit',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2025-1222-C2M', weight: '1800kg' },
      { trackingNumber: 'GBX-2025-1222-C2N', weight: '1750kg' },
      { trackingNumber: 'GBX-2025-1222-C2O', weight: '1820kg' },
      { trackingNumber: 'GBX-2025-1222-C2P', weight: '1680kg' },
    ],
  },
  {
    sku: 'GBX-2026-0108-T4Q',
    customer: 'Acer Inc.',
    origin: 'Taiwan',
    destination: 'USA',
    departure: 'Jan. 08, 2026',
    eta: 'Jan. 10, 2026',
    status: 'Delivered',
    type: 'Air',
    priority: 'Express',
    packages: [
      { trackingNumber: 'GBX-2026-0108-T4Q', weight: '18kg' },
      { trackingNumber: 'GBX-2026-0108-T4R', weight: '22kg' },
    ],
  },
  {
    sku: 'GBX-2026-0114-U6S',
    customer: 'Rolls-Royce Holdings',
    origin: 'United Kingdom',
    destination: 'Taiwan',
    departure: 'Jan. 14, 2026',
    eta: 'Jan. 16, 2026',
    status: 'Delivered',
    type: 'Air',
    priority: 'Express',
    packages: [{ trackingNumber: 'GBX-2026-0114-U6S', weight: '95kg' }],
  },
  {
    sku: 'GBX-2026-0121-K8T',
    customer: 'SK Hynix',
    origin: 'South Korea',
    destination: 'China',
    departure: 'Jan. 21, 2026',
    eta: 'Jan. 28, 2026',
    status: 'In transit',
    type: 'Road',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0121-K8T', weight: '240kg' },
      { trackingNumber: 'GBX-2026-0121-K8U', weight: '260kg' },
    ],
  },
  {
    sku: 'GBX-2026-0127-N1V',
    customer: 'Access Bank Plc',
    origin: 'Nigeria',
    destination: 'United Kingdom',
    departure: 'Jan. 27, 2026',
    eta: 'Jan. 29, 2026',
    status: 'In transit',
    type: 'Air',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2026-0127-N1V', weight: '5kg' }],
  },
  {
    sku: 'GBX-2026-0203-C3W',
    customer: 'Tencent Holdings',
    origin: 'China',
    destination: 'USA',
    departure: 'Feb. 03, 2026',
    eta: 'Mar. 05, 2026',
    status: 'In transit',
    type: 'Ocean',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2026-0203-C3W', weight: '780kg' },
      { trackingNumber: 'GBX-2026-0203-C3X', weight: '810kg' },
      { trackingNumber: 'GBX-2026-0203-C3Y', weight: '795kg' },
    ],
  },
  {
    sku: 'GBX-2026-0205-T5Z',
    customer: 'MediaTek Inc.',
    origin: 'Taiwan',
    destination: 'South Korea',
    departure: 'Feb. 05, 2026',
    eta: 'Feb. 12, 2026',
    status: 'Pending',
    type: 'Road',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2026-0205-T5Z', weight: '68kg' }],
  },
  {
    sku: 'GBX-2026-0207-U7A',
    customer: 'Amazon UK',
    origin: 'United Kingdom',
    destination: 'USA',
    departure: 'Feb. 07, 2026',
    eta: 'Feb. 09, 2026',
    status: 'Pending',
    type: 'Air',
    priority: 'Express',
    packages: [
      { trackingNumber: 'GBX-2026-0207-U7A', weight: '32kg' },
      { trackingNumber: 'GBX-2026-0207-U7B', weight: '28kg' },
      { trackingNumber: 'GBX-2026-0207-U7C', weight: '35kg' },
      { trackingNumber: 'GBX-2026-0207-U7D', weight: '29kg' },
    ],
  },
  {
    sku: 'GBX-2026-0210-K9E',
    customer: 'Kia Corporation',
    origin: 'South Korea',
    destination: 'Nigeria',
    departure: 'Feb. 10, 2026',
    eta: 'Mar. 12, 2026',
    status: 'Pending',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0210-K9E', weight: '1950kg' },
      { trackingNumber: 'GBX-2026-0210-K9F', weight: '2020kg' },
    ],
  },
  {
    sku: 'GBX-2026-0212-N2G',
    customer: 'Flutterwave',
    origin: 'Nigeria',
    destination: 'Taiwan',
    departure: 'Feb. 12, 2026',
    eta: 'Feb. 14, 2026',
    status: 'Pending',
    type: 'Air',
    priority: 'Express',
    packages: [{ trackingNumber: 'GBX-2026-0212-N2G', weight: '8kg' }],
  },
  {
    sku: 'GBX-2026-0215-C4H',
    customer: 'Xiaomi Corporation',
    origin: 'China',
    destination: 'United Kingdom',
    departure: 'Feb. 15, 2026',
    eta: 'Feb. 22, 2026',
    status: 'Pending',
    type: 'Road',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2026-0215-C4H', weight: '145kg' },
      { trackingNumber: 'GBX-2026-0215-C4I', weight: '152kg' },
      { trackingNumber: 'GBX-2026-0215-C4J', weight: '138kg' },
    ],
  },
  {
    sku: 'GBX-2026-0217-T6K',
    customer: 'ASUSTeK Computer',
    origin: 'Taiwan',
    destination: 'Nigeria',
    departure: 'Feb. 17, 2026',
    eta: 'Mar. 19, 2026',
    status: 'Pending',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0217-T6K', weight: '420kg' },
      { trackingNumber: 'GBX-2026-0217-T6L', weight: '385kg' },
    ],
  },
  {
    sku: 'GBX-2026-0219-U8M',
    customer: 'Unilever UK',
    origin: 'United Kingdom',
    destination: 'China',
    departure: 'Feb. 19, 2026',
    eta: 'Feb. 21, 2026',
    status: 'Pending',
    type: 'Air',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2026-0219-U8M', weight: '58kg' }],
  },
  {
    sku: 'GBX-2025-0805-K1N',
    customer: 'Posco International',
    origin: 'South Korea',
    destination: 'Taiwan',
    departure: 'Aug. 05, 2025',
    eta: 'Aug. 12, 2025',
    status: 'Delivered',
    type: 'Road',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2025-0805-K1N', weight: '520kg' },
      { trackingNumber: 'GBX-2025-0805-K1O', weight: '495kg' },
      { trackingNumber: 'GBX-2025-0805-K1P', weight: '510kg' },
    ],
  },
  {
    sku: 'GBX-2025-0918-N3Q',
    customer: 'Zenith Bank',
    origin: 'Nigeria',
    destination: 'South Korea',
    departure: 'Sep. 18, 2025',
    eta: 'Sep. 20, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Express',
    packages: [
      { trackingNumber: 'GBX-2025-0918-N3Q', weight: '12kg' },
      { trackingNumber: 'GBX-2025-0918-N3R', weight: '9kg' },
    ],
  },
  {
    sku: 'GBX-2025-1002-C5S',
    customer: 'DJI Technology',
    origin: 'China',
    destination: 'Taiwan',
    departure: 'Oct. 02, 2025',
    eta: 'Oct. 09, 2025',
    status: 'Delivered',
    type: 'Road',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2025-1002-C5S', weight: '85kg' }],
  },
  {
    sku: 'GBX-2025-1115-T7T',
    customer: 'Delta Electronics',
    origin: 'Taiwan',
    destination: 'United Kingdom',
    departure: 'Nov. 15, 2025',
    eta: 'Dec. 15, 2025',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2025-1115-T7T', weight: '680kg' },
      { trackingNumber: 'GBX-2025-1115-T7U', weight: '720kg' },
      { trackingNumber: 'GBX-2025-1115-T7V', weight: '695kg' },
      { trackingNumber: 'GBX-2025-1115-T7W', weight: '710kg' },
    ],
  },
  {
    sku: 'GBX-2025-1208-U9X',
    customer: 'BAE Systems',
    origin: 'United Kingdom',
    destination: 'South Korea',
    departure: 'Dec. 08, 2025',
    eta: 'Dec. 10, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Express',
    packages: [{ trackingNumber: 'GBX-2025-1208-U9X', weight: '125kg' }],
  },
  {
    sku: 'GBX-2026-0103-K2Y',
    customer: 'Naver Corporation',
    origin: 'South Korea',
    destination: 'United Kingdom',
    departure: 'Jan. 03, 2026',
    eta: 'Feb. 02, 2026',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0103-K2Y', weight: '340kg' },
      { trackingNumber: 'GBX-2026-0103-K2Z', weight: '365kg' },
    ],
  },
  {
    sku: 'GBX-2026-0116-N4A',
    customer: 'Interswitch Group',
    origin: 'Nigeria',
    destination: 'USA',
    departure: 'Jan. 16, 2026',
    eta: 'Jan. 18, 2026',
    status: 'Delivered',
    type: 'Air',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0116-N4A', weight: '15kg' },
      { trackingNumber: 'GBX-2026-0116-N4B', weight: '18kg' },
      { trackingNumber: 'GBX-2026-0116-N4C', weight: '14kg' },
    ],
  },
  {
    sku: 'GBX-2026-0125-C6D',
    customer: 'Lenovo Group',
    origin: 'China',
    destination: 'Nigeria',
    departure: 'Jan. 25, 2026',
    eta: 'Feb. 24, 2026',
    status: 'In transit',
    type: 'Ocean',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2026-0125-C6D', weight: '950kg' },
      { trackingNumber: 'GBX-2026-0125-C6E', weight: '920kg' },
      { trackingNumber: 'GBX-2026-0125-C6F', weight: '985kg' },
    ],
  },
  {
    sku: 'GBX-2026-0130-T8G',
    customer: 'Pegatron Corporation',
    origin: 'Taiwan',
    destination: 'China',
    departure: 'Jan. 30, 2026',
    eta: 'Feb. 06, 2026',
    status: 'In transit',
    type: 'Road',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2026-0130-T8G', weight: '210kg' }],
  },
  {
    sku: 'GBX-2026-0202-U1H',
    customer: 'GlaxoSmithKline',
    origin: 'United Kingdom',
    destination: 'Nigeria',
    departure: 'Feb. 02, 2026',
    eta: 'Mar. 04, 2026',
    status: 'In transit',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0202-U1H', weight: '1250kg' },
      { trackingNumber: 'GBX-2026-0202-U1I', weight: '1180kg' },
      { trackingNumber: 'GBX-2026-0202-U1J', weight: '1220kg' },
      { trackingNumber: 'GBX-2026-0202-U1K', weight: '1290kg' },
      { trackingNumber: 'GBX-2026-0202-U1L', weight: '1165kg' },
    ],
  },
  {
    sku: 'GBX-2026-0206-K3M',
    customer: 'CJ CheilJedang',
    origin: 'South Korea',
    destination: 'USA',
    departure: 'Feb. 06, 2026',
    eta: 'Feb. 08, 2026',
    status: 'In transit',
    type: 'Air',
    priority: 'Express',
    packages: [
      { trackingNumber: 'GBX-2026-0206-K3M', weight: '45kg' },
      { trackingNumber: 'GBX-2026-0206-K3N', weight: '52kg' },
    ],
  },
  {
    sku: 'GBX-2026-0209-N5O',
    customer: 'Guaranty Trust Bank',
    origin: 'Nigeria',
    destination: 'China',
    departure: 'Feb. 09, 2026',
    eta: 'Feb. 16, 2026',
    status: 'Pending',
    type: 'Road',
    priority: 'Economy',
    packages: [{ trackingNumber: 'GBX-2026-0209-N5O', weight: '22kg' }],
  },
  {
    sku: 'GBX-2026-0211-C7P',
    customer: 'Haier Group',
    origin: 'China',
    destination: 'South Korea',
    departure: 'Feb. 11, 2026',
    eta: 'Feb. 18, 2026',
    status: 'Pending',
    type: 'Road',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0211-C7P', weight: '320kg' },
      { trackingNumber: 'GBX-2026-0211-C7Q', weight: '295kg' },
      { trackingNumber: 'GBX-2026-0211-C7R', weight: '310kg' },
    ],
  },
  {
    sku: 'GBX-2026-0213-T9S',
    customer: 'Giant Manufacturing',
    origin: 'Taiwan',
    destination: 'USA',
    departure: 'Feb. 13, 2026',
    eta: 'Mar. 15, 2026',
    status: 'Pending',
    type: 'Ocean',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2026-0213-T9S', weight: '580kg' },
      { trackingNumber: 'GBX-2026-0213-T9T', weight: '615kg' },
    ],
  },
  {
    sku: 'GBX-2026-0216-U2U',
    customer: 'AstraZeneca UK',
    origin: 'United Kingdom',
    destination: 'Taiwan',
    departure: 'Feb. 16, 2026',
    eta: 'Feb. 18, 2026',
    status: 'Pending',
    type: 'Air',
    priority: 'Express',
    packages: [
      { trackingNumber: 'GBX-2026-0216-U2U', weight: '38kg' },
      { trackingNumber: 'GBX-2026-0216-U2V', weight: '42kg' },
      { trackingNumber: 'GBX-2026-0216-U2W', weight: '35kg' },
    ],
  },
  {
    sku: 'GBX-2025-0728-K4X',
    customer: 'Doosan Corporation',
    origin: 'South Korea',
    destination: 'Nigeria',
    departure: 'Jul. 28, 2025',
    eta: 'Aug. 27, 2025',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2025-0728-K4X', weight: '2250kg' },
      { trackingNumber: 'GBX-2025-0728-K4Y', weight: '2180kg' },
      { trackingNumber: 'GBX-2025-0728-K4Z', weight: '2300kg' },
    ],
  },
  {
    sku: 'GBX-2025-0815-N6A',
    customer: 'Andela',
    origin: 'Nigeria',
    destination: 'United Kingdom',
    departure: 'Aug. 15, 2025',
    eta: 'Aug. 17, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2025-0815-N6A', weight: '18kg' }],
  },
  {
    sku: 'GBX-2025-0925-C8B',
    customer: 'SAIC Motor Corporation',
    origin: 'China',
    destination: 'USA',
    departure: 'Sep. 25, 2025',
    eta: 'Oct. 25, 2025',
    status: 'Delivered',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2025-0925-C8B', weight: '1850kg' },
      { trackingNumber: 'GBX-2025-0925-C8C', weight: '1920kg' },
      { trackingNumber: 'GBX-2025-0925-C8D', weight: '1780kg' },
      { trackingNumber: 'GBX-2025-0925-C8E', weight: '1890kg' },
    ],
  },
  {
    sku: 'GBX-2025-1010-T1F',
    customer: 'Hon Hai Precision (Foxconn)',
    origin: 'Taiwan',
    destination: 'South Korea',
    departure: 'Oct. 10, 2025',
    eta: 'Oct. 17, 2025',
    status: 'Delivered',
    type: 'Road',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2025-1010-T1F', weight: '185kg' },
      { trackingNumber: 'GBX-2025-1010-T1G', weight: '192kg' },
    ],
  },
  {
    sku: 'GBX-2025-1122-U3H',
    customer: 'HSBC UK',
    origin: 'United Kingdom',
    destination: 'USA',
    departure: 'Nov. 22, 2025',
    eta: 'Nov. 24, 2025',
    status: 'Delivered',
    type: 'Air',
    priority: 'Express',
    packages: [
      { trackingNumber: 'GBX-2025-1122-U3H', weight: '8kg' },
      { trackingNumber: 'GBX-2025-1122-U3I', weight: '11kg' },
      { trackingNumber: 'GBX-2025-1122-U3J', weight: '9kg' },
    ],
  },
  {
    sku: 'GBX-2025-1230-K5K',
    customer: 'Hanwha Group',
    origin: 'South Korea',
    destination: 'China',
    departure: 'Dec. 30, 2025',
    eta: 'Jan. 06, 2026',
    status: 'Delivered',
    type: 'Road',
    priority: 'Standard',
    packages: [{ trackingNumber: 'GBX-2025-1230-K5K', weight: '425kg' }],
  },
  {
    sku: 'GBX-2026-0119-N7L',
    customer: 'Jumia Technologies',
    origin: 'Nigeria',
    destination: 'Taiwan',
    departure: 'Jan. 19, 2026',
    eta: 'Jan. 21, 2026',
    status: 'Delivered',
    type: 'Air',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0119-N7L', weight: '24kg' },
      { trackingNumber: 'GBX-2026-0119-N7M', weight: '28kg' },
    ],
  },
  {
    sku: 'GBX-2026-0128-C9N',
    customer: 'Geely Automobile',
    origin: 'China',
    destination: 'United Kingdom',
    departure: 'Jan. 28, 2026',
    eta: 'Feb. 27, 2026',
    status: 'In transit',
    type: 'Ocean',
    priority: 'Standard',
    packages: [
      { trackingNumber: 'GBX-2026-0128-C9N', weight: '2100kg' },
      { trackingNumber: 'GBX-2026-0128-C9O', weight: '2050kg' },
      { trackingNumber: 'GBX-2026-0128-C9P', weight: '2150kg' },
    ],
  },
  {
    sku: 'GBX-2026-0204-T2Q',
    customer: 'Quanta Computer',
    origin: 'Taiwan',
    destination: 'Nigeria',
    departure: 'Feb. 04, 2026',
    eta: 'Feb. 06, 2026',
    status: 'In transit',
    type: 'Air',
    priority: 'Express',
    packages: [
      { trackingNumber: 'GBX-2026-0204-T2Q', weight: '65kg' },
      { trackingNumber: 'GBX-2026-0204-T2R', weight: '72kg' },
      { trackingNumber: 'GBX-2026-0204-T2S', weight: '68kg' },
      { trackingNumber: 'GBX-2026-0204-T2T', weight: '70kg' },
    ],
  },
  {
    sku: 'GBX-2026-0208-U4U',
    customer: 'Diageo UK',
    origin: 'United Kingdom',
    destination: 'China',
    departure: 'Feb. 08, 2026',
    eta: 'Mar. 10, 2026',
    status: 'Pending',
    type: 'Ocean',
    priority: 'Economy',
    packages: [
      { trackingNumber: 'GBX-2026-0208-U4U', weight: '1420kg' },
      { trackingNumber: 'GBX-2026-0208-U4V', weight: '1385kg' },
      { trackingNumber: 'GBX-2026-0208-U4W', weight: '1450kg' },
    ],
  },
];

const locationMap: Record<string, string[]> = {
  China: ['Shanghai, CN', 'Shenzhen, CN'],
  'South Korea': ['Seoul, KR'],
  Nigeria: ['Lagos, NG'],
  'United Kingdom': ['London, UK'],
  USA: ['New York, NY'],
  Taiwan: ['Taipei, TW'],
};

const statusMap: Record<string, ShipmentStatus> = {
  Delivered: 'delivered',
  'In transit': 'in_transit',
  Pending: 'pending',
};

const modeMap: Record<string, ShipmentMode> = {
  Air: 'air',
  Ocean: 'ocean',
  Road: 'road',
};

const priorityMap: Record<string, ShipmentPriority> = {
  Express: 'express',
  Standard: 'standard',
  Economy: 'economy',
};

const monthIndex: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const normalizeLocation = (value: string, index: number): string => {
  if (value.includes(',')) return value;
  const options = locationMap[value];
  if (!options) return value;
  return options[index % options.length];
};

const parseDate = (value: string): string => {
  const cleaned = value.replace(/\./g, '').replace(',', '');
  const [monthToken, dayToken, yearToken] = cleaned.split(' ');
  const month = monthIndex[monthToken];
  const day = Number(dayToken);
  const year = Number(yearToken);

  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) {
    return value;
  }

  return new Date(Date.UTC(year, month, day, 8, 0, 0)).toISOString();
};

const shipments: ShipmentRecord[] = rawShipments.map((shipment, index) => ({
  id: `ship-${index + 1}`,
  sku: shipment.sku,
  customer: shipment.customer,
  origin: normalizeLocation(shipment.origin, index),
  destination: normalizeLocation(shipment.destination, index + 1),
  departureDate: parseDate(shipment.departure),
  etaDate: parseDate(shipment.eta),
  status: statusMap[shipment.status] ?? 'pending',
  mode: modeMap[shipment.type] ?? 'air',
  priority: priorityMap[shipment.priority] ?? 'standard',
}));

const totalShipments = shipments.length;
const statusCounts = shipments.reduce(
  (acc, shipment) => {
    acc[shipment.status] += 1;
    return acc;
  },
  { in_transit: 0, delivered: 0, pending: 0 } as Record<ShipmentStatus, number>
);

const totalItems = rawShipments.reduce(
  (sum, shipment) => sum + shipment.packages.length,
  0
);

const totalWeight = rawShipments.reduce((sum, shipment) => {
  const shipmentWeight = shipment.packages.reduce((acc, pkg) => {
    const weightValue = Number.parseFloat(pkg.weight.replace('kg', ''));
    return acc + (Number.isNaN(weightValue) ? 0 : weightValue);
  }, 0);
  return sum + shipmentWeight;
}, 0);

const totalValue = 149560;
const numberFormat = new Intl.NumberFormat('en-US');
const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const averageWeight =
  totalShipments === 0 ? 0 : Math.round(totalWeight / totalShipments);
const averageValue =
  totalShipments === 0 ? 0 : Math.round(totalValue / totalShipments);
const averageItems =
  totalShipments === 0 ? 0 : Math.round(totalItems / totalShipments);

export const mockShipmentsDashboard: ShipmentsDashboardData = {
  header: {
    title: 'All Shipment',
    subtitle: 'Manage and track shipments across your logistic network',
  },
  summary: {
    overview: {
      title: 'Total shipment',
      total: totalShipments,
      breakdown: [
        {
          id: 'in-transit',
          label: 'In Transit',
          value: statusCounts.in_transit,
          status: 'in_transit',
        },
        {
          id: 'delivered',
          label: 'Delivered',
          value: statusCounts.delivered,
          status: 'delivered',
        },
        {
          id: 'pending',
          label: 'Delayed/Pending',
          value: statusCounts.pending,
          status: 'pending',
        },
      ],
    },
    metrics: [
      {
        id: 'weight',
        title: 'Total Weight',
        value: totalWeight,
        unit: 'kg',
        helperText: `Average weight per shipment: ${numberFormat.format(averageWeight)}kg`,
        icon: 'weight',
      },
      {
        id: 'value',
        title: 'Total Value',
        value: totalValue,
        unit: 'USD',
        helperText: `Average value per shipment: ${currencyFormat.format(averageValue)}`,
        icon: 'value',
      },
      {
        id: 'items',
        title: 'Total Items',
        value: totalItems,
        unit: 'items',
        helperText: `Average item per shipment: ${numberFormat.format(averageItems)}`,
        icon: 'items',
      },
    ],
  },
  filters: [
    { id: 'all', label: 'All Shipment', value: 'all' },
    { id: 'in-transit', label: 'In-transit', value: 'in_transit' },
    { id: 'pending', label: 'Pending', value: 'pending' },
    { id: 'delivered', label: 'Delivered', value: 'delivered' },
  ],
  table: {
    title: 'Shipment List',
  },
  shipments,
};
