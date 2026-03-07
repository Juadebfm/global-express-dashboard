import type { ShippingEstimate } from '@/services';

export type StepKey = 'shipment' | 'addresses' | 'packages' | 'review';

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
  estimate: ShippingEstimate | null;
  estimateLoading: boolean;
  fetchEstimate: () => Promise<void>;
}

export const STEP_KEYS: Array<{ id: StepKey; labelKey: string; descKey: string }> = [
  { id: 'shipment', labelKey: 'newShipment.steps.shipment.label', descKey: 'newShipment.steps.shipment.description' },
  { id: 'addresses', labelKey: 'newShipment.steps.addresses.label', descKey: 'newShipment.steps.addresses.description' },
  { id: 'packages', labelKey: 'newShipment.steps.packages.label', descKey: 'newShipment.steps.packages.description' },
  { id: 'review', labelKey: 'newShipment.steps.review.label', descKey: 'newShipment.steps.review.description' },
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
