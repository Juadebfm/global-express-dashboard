import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Bookmark, Info, RotateCcw, Trash2 } from 'lucide-react';
import { useDashboardData, useSearch } from '@/hooks';
import { AppShell } from '@/pages/shared';
import { cn } from '@/utils';

interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  time: string;
  dateTime: string;
  unread?: boolean;
  saved?: boolean;
}

const initialNotifications: NotificationItem[] = [
  {
    id: 'note-1',
    title: 'Delivery Completed',
    subtitle: 'Shipment #SH-2024-001 delivered to John Smith.',
    description:
      'Shipment #SH-2024-001 has been successfully delivered to customer John Smith at 123 Main St. Proof of delivery was captured at 8:32 AM with signature on file. The package was left at the front desk per customer request.',
    time: '8:38 AM',
    dateTime: 'Feb 18, 2026 - 8:38 AM',
    unread: true,
  },
  {
    id: 'note-2',
    title: 'New Order Received',
    subtitle: 'Order #ORD-2024-045 from CargoTech Industries.',
    description:
      'New order #ORD-2024-045 received from CargoTech Industries for 15 packages. Pickup window is scheduled for today between 1:00 PM and 4:00 PM. Priority handling requested.',
    time: '8:31 AM',
    dateTime: 'Feb 18, 2026 - 8:31 AM',
    unread: true,
  },
  {
    id: 'note-3',
    title: 'Customs Cleared',
    subtitle: 'Shipment #SH-2024-014 cleared in Lagos.',
    description:
      'Customs clearance completed for shipment #SH-2024-014. Documentation verified and release granted for onward transit.',
    time: '8:10 AM',
    dateTime: 'Feb 18, 2026 - 8:10 AM',
    unread: true,
  },
  {
    id: 'note-4',
    title: 'System Update Complete',
    subtitle: 'Platform updated to version 2.1.3.',
    description:
      'Shipment management system has been successfully updated to version 2.1.3. Release 2.1.3 includes improved shipment search, optimized route suggestions, and stability fixes.',
    time: '7:58 AM',
    dateTime: 'Feb 18, 2026 - 7:58 AM',
  },
  {
    id: 'note-5',
    title: 'Route Optimization Complete',
    subtitle: 'Daily routes optimized with 12% improvement.',
    description:
      'Daily route optimization has been completed. 12% efficiency improvement achieved. Top savings came from consolidating midtown deliveries.',
    time: '7:44 AM',
    dateTime: 'Feb 18, 2026 - 7:44 AM',
  },
  {
    id: 'note-6',
    title: 'New Order Received',
    subtitle: 'Order #ORD-2024-052 from Swift Logistics.',
    description:
      'New order #ORD-2024-052 received for 8 packages with delivery SLA of 48 hours.',
    time: '7:32 AM',
    dateTime: 'Feb 18, 2026 - 7:32 AM',
  },
  {
    id: 'note-7',
    title: 'Delivery Completed',
    subtitle: 'Shipment #SH-2024-005 delivered to Chioma Eze.',
    description:
      'Shipment #SH-2024-005 delivered at 6:58 AM. Package received by recipient with ID verification.',
    time: '7:12 AM',
    dateTime: 'Feb 18, 2026 - 7:12 AM',
  },
  {
    id: 'note-8',
    title: 'Fuel Surcharge Updated',
    subtitle: 'Fuel surcharge adjusted to 7.4%.',
    description:
      'Fuel surcharge has been updated based on weekly averages. This will apply to new bookings starting today.',
    time: '6:55 AM',
    dateTime: 'Feb 18, 2026 - 6:55 AM',
  },
  {
    id: 'note-9',
    title: 'Pickup Delayed',
    subtitle: 'Pickup for order #ORD-2024-037 delayed.',
    description:
      'Driver delay reported. Updated pickup time is 11:30 AM. Customer has been notified.',
    time: '6:40 AM',
    dateTime: 'Feb 18, 2026 - 6:40 AM',
  },
  {
    id: 'note-10',
    title: 'Warehouse Slot Assigned',
    subtitle: 'Dock 3 assigned for inbound shipment #SH-2024-021.',
    description:
      'Inbound shipment #SH-2024-021 has been assigned to Dock 3. Unloading window begins at 2:00 PM.',
    time: '6:28 AM',
    dateTime: 'Feb 18, 2026 - 6:28 AM',
  },
  {
    id: 'note-11',
    title: 'Invoice Generated',
    subtitle: 'Invoice #INV-2024-118 created for CargoTech Industries.',
    description:
      'Invoice #INV-2024-118 generated for completed deliveries. Total amount due is $4,820.',
    time: '6:05 AM',
    dateTime: 'Feb 18, 2026 - 6:05 AM',
  },
  {
    id: 'note-12',
    title: 'Driver Check-in',
    subtitle: 'Driver Musa checked in at Abuja hub.',
    description:
      'Driver Musa checked in and confirmed vehicle inspection. Departure scheduled for 9:00 AM.',
    time: '5:52 AM',
    dateTime: 'Feb 18, 2026 - 5:52 AM',
  },
  {
    id: 'note-13',
    title: 'Holiday Notice — Presidents Day',
    subtitle: 'Operations closed Feb 17, 2026 for Presidents Day.',
    description:
      'Global Express offices and pickup centers were closed on Monday, Feb 17, 2026 in observance of Presidents Day. All pending shipments scheduled for that day were automatically rescheduled to Feb 18. Please plan accordingly.',
    time: 'Feb 14, 9:00 AM',
    dateTime: 'Feb 14, 2026 - 9:00 AM',
  },
  {
    id: 'note-14',
    title: 'Customs Clearance Approved',
    subtitle: 'Shipment #SH-2024-089 cleared customs successfully.',
    description:
      'Shipment #SH-2024-089 from Shanghai, China has cleared US Customs and Border Protection. Estimated arrival at the destination warehouse is Feb 19, 2026. All import duties have been settled.',
    time: 'Feb 18, 7:45 AM',
    dateTime: 'Feb 18, 2026 - 7:45 AM',
  },
  {
    id: 'note-15',
    title: 'Driver Assigned',
    subtitle: 'Driver Mark Torres assigned to Route #R-112.',
    description:
      "Driver Mark Torres has been assigned to Route #R-112 for today's deliveries. The route covers 23 stops across the downtown district. Estimated completion by 5:00 PM.",
    time: 'Feb 18, 7:00 AM',
    dateTime: 'Feb 18, 2026 - 7:00 AM',
  },
  {
    id: 'note-16',
    title: 'Payment Confirmed',
    subtitle: 'Invoice #INV-2026-0312 paid by Nexus Logistics.',
    description:
      'Payment of $4,280.00 has been received for Invoice #INV-2026-0312 from Nexus Logistics. The payment has been applied to your account. Thank you for your prompt settlement.',
    time: 'Feb 17, 3:22 PM',
    dateTime: 'Feb 17, 2026 - 3:22 PM',
  },
  {
    id: 'note-17',
    title: 'Weather Delay Alert',
    subtitle: 'Winter storm affecting deliveries in the Northeast.',
    description:
      'A winter storm warning is in effect for the Northeast corridor through Feb 19. Routes #R-205 through #R-218 may experience delays of up to 4 hours. Customers have been notified automatically.',
    time: 'Feb 17, 11:00 AM',
    dateTime: 'Feb 17, 2026 - 11:00 AM',
  },
  {
    id: 'note-18',
    title: 'Shipment On Hold',
    subtitle: 'Shipment #SH-2024-102 held for address verification.',
    description:
      'Shipment #SH-2024-102 has been placed on hold pending address verification for the recipient. The address provided appears to be incomplete. Please contact the sender to resolve the issue within 48 hours.',
    time: 'Feb 17, 9:15 AM',
    dateTime: 'Feb 17, 2026 - 9:15 AM',
  },
  {
    id: 'note-19',
    title: "Holiday Notice — Valentine's Day",
    subtitle: 'High volume expected Feb 14 — plan shipments early.',
    description:
      "Valentine's Day on Feb 14, 2026 generated a 40% increase in parcel volume, particularly for florists and gift retailers. Scheduling pickups before noon on Feb 13 was recommended to guarantee same-day dispatch.",
    time: 'Feb 10, 10:00 AM',
    dateTime: 'Feb 10, 2026 - 10:00 AM',
  },
  {
    id: 'note-20',
    title: 'New Client Onboarded',
    subtitle: 'Pinnacle Retail Group added as a new account.',
    description:
      'Pinnacle Retail Group has been successfully onboarded as a new corporate account. Their account manager is Sarah Chen. First scheduled pickup is Feb 20, 2026 from their Atlanta distribution center.',
    time: 'Feb 16, 2:00 PM',
    dateTime: 'Feb 16, 2026 - 2:00 PM',
  },
  {
    id: 'note-21',
    title: 'Delivery Failed',
    subtitle: 'Shipment #SH-2024-077 — recipient not available.',
    description:
      'Delivery attempt for Shipment #SH-2024-077 was unsuccessful. The recipient was not present and no safe drop location was available. A second attempt will be made on Feb 19. A delivery notice has been left at the property.',
    time: 'Feb 16, 4:50 PM',
    dateTime: 'Feb 16, 2026 - 4:50 PM',
  },
  {
    id: 'note-22',
    title: 'Fuel Surcharge Update',
    subtitle: 'Fuel surcharge adjusted to 8.2% effective Mar 1.',
    description:
      'Due to rising fuel costs, the fuel surcharge will be updated to 8.2% effective March 1, 2026. This applies to all domestic ground shipments. Updated rate sheets have been sent to all account holders.',
    time: 'Feb 15, 1:00 PM',
    dateTime: 'Feb 15, 2026 - 1:00 PM',
  },
  {
    id: 'note-23',
    title: 'Warehouse Capacity Alert',
    subtitle: 'Chicago hub at 92% storage capacity.',
    description:
      'The Chicago distribution hub is currently at 92% storage capacity. Overflow shipments will be rerouted to the Milwaukee satellite warehouse. Please avoid scheduling additional inbound freight to Chicago until further notice.',
    time: 'Feb 15, 8:30 AM',
    dateTime: 'Feb 15, 2026 - 8:30 AM',
  },
  {
    id: 'note-24',
    title: 'Holiday Notice — Memorial Day',
    subtitle: 'Operations closed May 25, 2026 for Memorial Day.',
    description:
      'All Global Express facilities will be closed on Monday, May 25, 2026 in observance of Memorial Day. Shipments scheduled for that date will be processed on May 26. Updated schedules will be distributed in May.',
    time: 'Feb 12, 9:00 AM',
    dateTime: 'Feb 12, 2026 - 9:00 AM',
  },
  {
    id: 'note-25',
    title: 'New Order Received',
    subtitle: 'Order #ORD-2026-112 from Summit Healthcare.',
    description:
      'New order #ORD-2026-112 received from Summit Healthcare for 8 temperature-controlled packages. Cold chain handling is required. Pickup is scheduled for Feb 19 between 8:00 AM and 10:00 AM.',
    time: 'Feb 14, 3:45 PM',
    dateTime: 'Feb 14, 2026 - 3:45 PM',
  },
  {
    id: 'note-26',
    title: 'Customs Delay',
    subtitle: 'Shipment #SH-2024-095 delayed at Miami port.',
    description:
      'Shipment #SH-2024-095 is experiencing a customs delay at the Port of Miami due to a random secondary inspection. Estimated clearance is Feb 20, 2026. We will keep you updated as the situation develops.',
    time: 'Feb 14, 11:30 AM',
    dateTime: 'Feb 14, 2026 - 11:30 AM',
  },
  {
    id: 'note-27',
    title: 'Vehicle Maintenance Scheduled',
    subtitle: 'Fleet vehicle GEX-047 scheduled for maintenance Feb 20.',
    description:
      'Fleet vehicle GEX-047 (2023 Sprinter Van) is scheduled for routine maintenance on Feb 20, 2026. The vehicle will be unavailable for deliveries from 7:00 AM to 2:00 PM. Route adjustments have been applied automatically.',
    time: 'Feb 13, 4:00 PM',
    dateTime: 'Feb 13, 2026 - 4:00 PM',
  },
  {
    id: 'note-28',
    title: 'Holiday Notice — Independence Day',
    subtitle: 'Operations closed Jul 4, 2026 for Independence Day.',
    description:
      'Global Express will be closed on Saturday, July 4, 2026 in observance of Independence Day. Pickups scheduled for July 4 will be moved to July 6. Advance shipment bookings are recommended for the surrounding week.',
    time: 'Feb 11, 9:00 AM',
    dateTime: 'Feb 11, 2026 - 9:00 AM',
  },
  {
    id: 'note-29',
    title: 'Package Damaged in Transit',
    subtitle: 'Shipment #SH-2024-083 reported damaged on arrival.',
    description:
      'Customer John Pearce has reported that Shipment #SH-2024-083 arrived with visible packaging damage. A damage claim (#CLM-2026-041) has been opened. Our claims team will contact the customer within 24 hours.',
    time: 'Feb 13, 2:15 PM',
    dateTime: 'Feb 13, 2026 - 2:15 PM',
  },
  {
    id: 'note-30',
    title: 'New Order Received',
    subtitle: 'Order #ORD-2026-098 from BlueSky Electronics.',
    description:
      'New order #ORD-2026-098 received from BlueSky Electronics for 32 packages requiring fragile handling. Pickup is scheduled for Feb 18 at 2:00 PM from their San Jose facility.',
    time: 'Feb 13, 10:00 AM',
    dateTime: 'Feb 13, 2026 - 10:00 AM',
  },
  {
    id: 'note-31',
    title: 'SLA Breach Warning',
    subtitle: 'Shipment #SH-2024-070 approaching delivery deadline.',
    description:
      'Shipment #SH-2024-070 has a guaranteed delivery deadline of 5:00 PM today. The current estimated arrival is 4:45 PM. Driver contact has been initiated to ensure on-time delivery. Monitoring in progress.',
    time: 'Feb 18, 3:00 PM',
    dateTime: 'Feb 18, 2026 - 3:00 PM',
  },
  {
    id: 'note-32',
    title: 'Holiday Notice — Labor Day',
    subtitle: 'Operations closed Sep 7, 2026 for Labor Day.',
    description:
      'All Global Express offices and warehouses will be closed on Monday, September 7, 2026 in observance of Labor Day. Shipments scheduled for that date will be rescheduled to September 8. Plan your logistics accordingly.',
    time: 'Feb 10, 9:00 AM',
    dateTime: 'Feb 10, 2026 - 9:00 AM',
  },
  {
    id: 'note-33',
    title: 'Delivery Completed',
    subtitle: 'Shipment #SH-2024-110 delivered to Metro Medical Center.',
    description:
      'Shipment #SH-2024-110 has been successfully delivered to Metro Medical Center at 9:10 AM. The delivery included 4 temperature-sensitive packages, all received in good condition by the receiving department.',
    time: 'Feb 18, 9:15 AM',
    dateTime: 'Feb 18, 2026 - 9:15 AM',
  },
  {
    id: 'note-34',
    title: 'Invoice Generated',
    subtitle: 'Invoice #INV-2026-0319 issued to Apex Manufacturing.',
    description:
      'Invoice #INV-2026-0319 for $7,640.50 has been issued to Apex Manufacturing for services rendered in Jan 2026. Payment is due by Mar 5, 2026. A copy has been emailed to their accounts payable department.',
    time: 'Feb 12, 5:00 PM',
    dateTime: 'Feb 12, 2026 - 5:00 PM',
  },
  {
    id: 'note-35',
    title: 'New Order Received',
    subtitle: 'Order #ORD-2026-127 from Coastal Home Goods.',
    description:
      'New order #ORD-2026-127 received from Coastal Home Goods for 60 packages. Standard ground shipping selected. Pickup scheduled for Feb 21, 2026. A confirmation has been sent to the client.',
    time: 'Feb 12, 11:00 AM',
    dateTime: 'Feb 12, 2026 - 11:00 AM',
  },
  {
    id: 'note-36',
    title: 'Holiday Notice — Thanksgiving',
    subtitle: 'Operations closed Nov 26, 2026 for Thanksgiving.',
    description:
      'Global Express will be closed on Thursday, November 26, 2026 in observance of Thanksgiving. Friday, November 27 will operate on a reduced schedule. Please plan holiday shipments with extra lead time to avoid delays.',
    time: 'Feb 9, 9:00 AM',
    dateTime: 'Feb 9, 2026 - 9:00 AM',
  },
  {
    id: 'note-37',
    title: 'Driver Incident Reported',
    subtitle: 'Minor incident reported by Driver L. Morales on Route #R-88.',
    description:
      'Driver Luis Morales reported a minor fender incident on Route #R-88 at 11:20 AM near the 5th & Commerce intersection. No injuries were reported. Fleet management has been dispatched and the route has been covered by a backup driver.',
    time: 'Feb 11, 11:45 AM',
    dateTime: 'Feb 11, 2026 - 11:45 AM',
  },
  {
    id: 'note-38',
    title: 'Account Password Reset',
    subtitle: 'Password reset requested for admin@globalexpress.com.',
    description:
      'A password reset was requested for the admin account (admin@globalexpress.com) at 6:02 PM. If you did not initiate this request, please contact IT security immediately at security@globalexpress.com.',
    time: 'Feb 11, 6:05 PM',
    dateTime: 'Feb 11, 2026 - 6:05 PM',
  },
  {
    id: 'note-39',
    title: 'Route Optimization Complete',
    subtitle: 'Weekly routes optimized — 9% cost reduction achieved.',
    description:
      'Weekly route optimization completed for the week of Feb 16–22. A 9% cost reduction has been identified through better load consolidation and smarter sequencing. Updated routes are live in the driver app.',
    time: 'Feb 15, 6:00 AM',
    dateTime: 'Feb 15, 2026 - 6:00 AM',
  },
  {
    id: 'note-40',
    title: 'Holiday Notice — Christmas Day',
    subtitle: 'Operations closed Dec 25, 2026 for Christmas.',
    description:
      'Global Express will be closed on Friday, December 25, 2026 in observance of Christmas Day. Holiday shipping deadlines will be published in November. We recommend booking peak-season capacity by October 31 to secure your slots.',
    time: 'Feb 8, 9:00 AM',
    dateTime: 'Feb 8, 2026 - 9:00 AM',
  },
  {
    id: 'note-41',
    title: 'Delivery Completed',
    subtitle: 'Shipment #SH-2024-119 delivered to Sunrise Retail Park.',
    description:
      'Shipment #SH-2024-119 containing 22 pallets has been successfully delivered to Sunrise Retail Park. Delivery was completed ahead of schedule at 1:45 PM. Signed POD is available in the shipment records.',
    time: 'Feb 10, 2:00 PM',
    dateTime: 'Feb 10, 2026 - 2:00 PM',
  },
  {
    id: 'note-42',
    title: 'System Maintenance Scheduled',
    subtitle: 'Planned downtime Feb 22, 2026 from 2:00–4:00 AM.',
    description:
      'The shipment management platform will undergo planned maintenance on Feb 22, 2026 from 2:00 AM to 4:00 AM EST. During this window the portal, driver app, and tracking APIs will be unavailable. No action is needed from users.',
    time: 'Feb 9, 3:00 PM',
    dateTime: 'Feb 9, 2026 - 3:00 PM',
  },
  {
    id: 'note-43',
    title: "Holiday Notice — New Year's Day",
    subtitle: "Operations closed Jan 1, 2027 for New Year's Day.",
    description:
      "All Global Express facilities will be closed on January 1, 2027 in observance of New Year's Day. End-of-year shipment cutoffs will be communicated in December 2026. We appreciate your partnership and wish you a wonderful holiday season.",
    time: 'Feb 8, 9:00 AM',
    dateTime: 'Feb 8, 2026 - 9:00 AM',
  },
  {
    id: 'note-44',
    title: 'New Order Received',
    subtitle: 'Order #ORD-2026-134 from Northern Wholesale Distributors.',
    description:
      'New order #ORD-2026-134 received from Northern Wholesale Distributors for 88 pallets. LTL freight service requested. Pickup is set for Feb 23 from their Minneapolis warehouse. Coordination with the freight team is underway.',
    time: 'Feb 8, 1:30 PM',
    dateTime: 'Feb 8, 2026 - 1:30 PM',
  },
  {
    id: 'note-45',
    title: 'Proof of Delivery Uploaded',
    subtitle: 'POD for Shipment #SH-2024-105 uploaded by driver.',
    description:
      'Driver Angela Reyes has uploaded the proof of delivery for Shipment #SH-2024-105. The document includes a digital signature from the recipient and a timestamped photo. Available for download in the shipment detail view.',
    time: 'Feb 7, 5:10 PM',
    dateTime: 'Feb 7, 2026 - 5:10 PM',
  },
  {
    id: 'note-46',
    title: 'Holiday Notice — MLK Jr. Day',
    subtitle: 'Reduced operations Jan 19, 2026 for MLK Day.',
    description:
      'Global Express operated on a reduced schedule on Monday, January 19, 2026 in observance of Martin Luther King Jr. Day. Only priority and express shipments were processed. Standard orders resumed on January 20.',
    time: 'Jan 10, 9:00 AM',
    dateTime: 'Jan 10, 2026 - 9:00 AM',
  },
  {
    id: 'note-47',
    title: 'Client Complaint Received',
    subtitle: 'Complaint filed by TechNova Corp — delayed shipment.',
    description:
      'TechNova Corp has filed a formal complaint regarding a 3-day delay on Shipment #SH-2024-091. Their account manager has been notified and a resolution meeting is scheduled for Feb 20, 2026 at 10:00 AM.',
    time: 'Feb 6, 9:45 AM',
    dateTime: 'Feb 6, 2026 - 9:45 AM',
  },
  {
    id: 'note-48',
    title: 'New Order Received',
    subtitle: 'Order #ORD-2026-141 from Pacific Pharma Supply.',
    description:
      'New order #ORD-2026-141 received from Pacific Pharma Supply for 12 cold-chain packages. GDP compliance documentation is required. Pickup is scheduled for Feb 24 from their San Diego facility.',
    time: 'Feb 5, 4:00 PM',
    dateTime: 'Feb 5, 2026 - 4:00 PM',
  },
  {
    id: 'note-49',
    title: 'Holiday Notice — Columbus Day',
    subtitle: 'Limited operations Oct 12, 2026 for Columbus Day.',
    description:
      'Select Global Express facilities will observe Columbus Day on October 12, 2026. Operations in states that observe this holiday may experience reduced staffing. Express shipments will continue as normal.',
    time: 'Feb 5, 9:00 AM',
    dateTime: 'Feb 5, 2026 - 9:00 AM',
  },
  {
    id: 'note-50',
    title: 'Delivery Completed',
    subtitle: 'Shipment #SH-2024-131 delivered to GreenLeaf Organics.',
    description:
      'Shipment #SH-2024-131 has been delivered to GreenLeaf Organics at 10:05 AM. The consignment included 6 refrigerated units, all delivered within acceptable temperature range. Recipient confirmed receipt in good condition.',
    time: 'Feb 4, 10:30 AM',
    dateTime: 'Feb 4, 2026 - 10:30 AM',
  },
  {
    id: 'note-51',
    title: 'Holiday Notice — Veterans Day',
    subtitle: 'Operations closed Nov 11, 2026 for Veterans Day.',
    description:
      'Global Express will be closed on Wednesday, November 11, 2026 in observance of Veterans Day. We honor all who have served. Shipments scheduled for that date will be rerouted to November 12. Thank you for your understanding.',
    time: 'Feb 4, 9:00 AM',
    dateTime: 'Feb 4, 2026 - 9:00 AM',
  },
  {
    id: 'note-52',
    title: 'System Update Complete',
    subtitle: 'Platform updated to version 2.2.0 with new features.',
    description:
      'The shipment management platform has been updated to version 2.2.0. New features include real-time carbon footprint tracking, enhanced bulk label printing, and improved API rate limit handling. Full release notes are available in the Help Center.',
    time: 'Feb 3, 7:00 AM',
    dateTime: 'Feb 3, 2026 - 7:00 AM',
  },
];

export function NotificationsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();
  const [items, setItems] = useState<NotificationItem[]>(() =>
    initialNotifications.map((item) => ({ ...item }))
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);

  const filteredItems = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) =>
      `${item.title} ${item.subtitle} ${item.description}`.toLowerCase().includes(value)
    );
  }, [items, query]);

  const newItems = filteredItems.filter((item) => item.unread);
  const oldItems = filteredItems.filter((item) => !item.unread);
  const hasSelection = selectedIds.size > 0;

  const toggleSelection = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveSelected = (): void => {
    if (!hasSelection) return;
    setItems((prev) => {
      const shouldSave = prev.some((item) => selectedIds.has(item.id) && !item.saved);
      return prev.map((item) =>
        selectedIds.has(item.id) ? { ...item, saved: shouldSave } : item
      );
    });
  };

  const handleMarkRead = (): void => {
    if (!hasSelection) return;
    setItems((prev) =>
      prev.map((item) =>
        selectedIds.has(item.id) ? { ...item, unread: false } : item
      )
    );
  };

  const handleDelete = (): void => {
    if (!hasSelection) return;
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
  };

  const handleRefresh = (): void => {
    setItems(initialNotifications.map((item) => ({ ...item })));
    setSelectedIds(new Set());
    setActiveNotification(null);
  };

  const openNotification = (item: NotificationItem): void => {
    const updated = { ...item, unread: false };
    setActiveNotification(updated);
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === item.id ? { ...entry, unread: false } : entry
      )
    );
  };

  const renderNotificationRow = (item: NotificationItem): ReactElement => {
    const isSelected = selectedIds.has(item.id);

    return (
      <div
        key={item.id}
        onClick={() => openNotification(item)}
        className={cn(
          'flex cursor-pointer items-start justify-between gap-4 px-6 py-4 transition',
          item.unread ? 'bg-rose-50' : 'bg-white',
          item.unread ? 'hover:bg-rose-100/70' : 'hover:bg-gray-50'
        )}
      >
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleSelection(item.id)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            aria-label={`Select ${item.title}`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
              {item.unread && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
                  New
                </span>
              )}
              {item.saved && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  Saved
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{item.subtitle}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-500">{item.time}</span>
      </div>
    );
  };

  return (
    <AppShell
      data={data}
      isLoading={isLoading}
      error={error}
      loadingLabel="Loading notifications..."
    >
      <div className="rounded-3xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <h1 className="text-xl font-semibold text-gray-900">Notification</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </button>
            <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={handleSaveSelected}
                disabled={!hasSelection}
                className={cn(
                  'flex h-10 w-11 items-center justify-center transition',
                  hasSelection
                    ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    : 'cursor-not-allowed text-gray-300'
                )}
                aria-label="Save selected"
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleMarkRead}
                disabled={!hasSelection}
                className={cn(
                  'flex h-10 w-11 items-center justify-center border-l border-gray-200 transition',
                  hasSelection
                    ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    : 'cursor-not-allowed text-gray-300'
                )}
                aria-label="Mark selected as read"
              >
                <Info className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!hasSelection}
                className={cn(
                  'flex h-10 w-11 items-center justify-center border-l border-gray-200 transition',
                  hasSelection
                    ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    : 'cursor-not-allowed text-gray-300'
                )}
                aria-label="Delete selected"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-gray-700">No notifications found</p>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your search to see more updates.
            </p>
          </div>
        ) : (
          <div className={cn('divide-y divide-gray-200', hasSelection && 'pb-24')}>
            {newItems.length > 0 && (
              <div className="bg-gray-50/70 px-6 py-2 text-xs font-semibold uppercase text-gray-500">
                New
              </div>
            )}
            {newItems.map((item) => renderNotificationRow(item))}
            {oldItems.length > 0 && (
              <div className="bg-gray-50/70 px-6 py-2 text-xs font-semibold uppercase text-gray-500">
                Earlier
              </div>
            )}
            {oldItems.map((item) => renderNotificationRow(item))}
          </div>
        )}

        {hasSelection && (
          <div className="sticky bottom-4 z-10 mt-4 px-6 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-800">
                  {selectedIds.size} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSelected}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
                >
                  <Bookmark className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleMarkRead}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
                >
                  <Info className="h-4 w-4" />
                  Mark read
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-7 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {activeNotification.title}
                </h2>
                <p className="text-sm text-gray-600">{activeNotification.subtitle}</p>
                <p className="text-xs font-medium text-gray-500">
                  {activeNotification.dateTime}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeNotification.unread && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
                    New
                  </span>
                )}
                {activeNotification.saved && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Saved
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-600">
              {activeNotification.description}
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setItems((prev) =>
                    prev.filter((item) => item.id !== activeNotification.id)
                  );
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(activeNotification.id);
                    return next;
                  });
                  setActiveNotification(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => setActiveNotification(null)}
                className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
