import type { PublicShippingEstimate } from '@/types';

export type StepKey = 'basics' | 'recipient' | 'review';

export interface StepDefinition {
  id: StepKey;
  label: string;
  description: string;
}

export interface ShipmentFormState {
  shipmentType: string;
  pickupDate: Date | null;
  deliveryDate: Date | null;
  pickupTime: string;
  deliveryTime: string;
  packageDescription: string;
  packageWeightKg: string;
  packageCbm: string;
  packageDeclaredValue: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  usePickupRep: boolean;
  pickupRepName: string;
  pickupRepPhone: string;
  selectedSenderId: string;
}

export interface ShipmentFormActions {
  setShipmentType: (v: string) => void;
  setPickupDate: (v: Date | null) => void;
  setDeliveryDate: (v: Date | null) => void;
  setPickupTime: (v: string) => void;
  setDeliveryTime: (v: string) => void;
  setPackageDescription: (v: string) => void;
  setPackageWeightKg: (v: string) => void;
  setPackageCbm: (v: string) => void;
  setPackageDeclaredValue: (v: string) => void;
  setRecipientName: (v: string) => void;
  setRecipientEmail: (v: string) => void;
  setRecipientPhone: (v: string) => void;
  setUsePickupRep: (v: boolean) => void;
  setPickupRepName: (v: string) => void;
  setPickupRepPhone: (v: string) => void;
  setSelectedSenderId: (v: string) => void;
}

export interface EstimateState {
  estimate: PublicShippingEstimate | null;
  estimateLoading: boolean;
  fetchEstimate: () => Promise<void>;
}

export const STEP_KEYS: Array<{ id: StepKey; labelKey: string; descKey: string }> = [
  { id: 'basics', labelKey: 'newShipment.steps.basics.label', descKey: 'newShipment.steps.basics.description' },
  { id: 'recipient', labelKey: 'newShipment.steps.recipient.label', descKey: 'newShipment.steps.recipient.description' },
  { id: 'review', labelKey: 'newShipment.steps.review.label', descKey: 'newShipment.steps.review.description' },
];

// Curated list of common cargo categories — surfaced in the BasicsStep
// "What's inside?" picker as quick-pick chips. The user can also type
// freeform text (e.g. "industrial bearings"), so this list is suggestive,
// not exhaustive.
export const SHIPMENT_CONTENT_CATEGORIES: Array<{ value: string; labelKey: string }> = [
  { value: 'Electronics', labelKey: 'newShipment.contentCategory.electronics' },
  { value: 'Clothing', labelKey: 'newShipment.contentCategory.clothing' },
  { value: 'Documents', labelKey: 'newShipment.contentCategory.documents' },
  { value: 'Food & Beverage', labelKey: 'newShipment.contentCategory.foodBeverage' },
  { value: 'Cosmetics', labelKey: 'newShipment.contentCategory.cosmetics' },
  { value: 'Machinery Parts', labelKey: 'newShipment.contentCategory.machineryParts' },
  { value: 'Household Goods', labelKey: 'newShipment.contentCategory.householdGoods' },
  { value: 'Other', labelKey: 'newShipment.contentCategory.other' },
];

export const SHIPMENT_TYPE_KEYS = [
  { value: 'air', labelKey: 'newShipment.shipmentType.air' },
  { value: 'ocean', labelKey: 'newShipment.shipmentType.ocean' },
];

export const ORIGIN_WAREHOUSE = {
  company: 'GLOBAL EXPRESS (Korea)',
  address: '76-25 Daehwa-ro, Ilsanseo-gu, Goyang-si, Gyeonggi-do (Bldg. B)',
  phone: '+82-10-4710-5920',
};

export const DESTINATION_OFFICE = {
  company: 'GLOBAL EXPRESS (Lagos)',
  address: '58B Awoniyi Elemo Street, Ajao Estate, Lagos',
  phone: '+234-000-000-0000',
};
