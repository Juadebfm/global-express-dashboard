import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Loader2,
  Copy,
  Mail,
  Package,
  X,
} from "lucide-react";
import { AppShell } from "@/pages/shared";
import { AlertBanner, Button, Checkbox } from "@/components/ui";
import { useAuth, useDashboardData } from "@/hooks";
import { ROUTES } from "@/constants";
import {
  createOrder,
  estimateShippingCost,
  getMyProfileCompleteness,
  syncClerkAccount,
} from "@/services";
import type { ShippingEstimate } from "@/services";
import { cn } from "@/utils";
import i18n from "@/i18n/i18n";

type StepKey = "shipment" | "addresses" | "packages" | "review";

interface StepDefinition {
  id: StepKey;
  label: string;
  description: string;
}


const STEP_KEYS: Array<{ id: StepKey; labelKey: string; descKey: string }> = [
  { id: "shipment", labelKey: "newShipment.steps.shipment.label", descKey: "newShipment.steps.shipment.description" },
  { id: "addresses", labelKey: "newShipment.steps.addresses.label", descKey: "newShipment.steps.addresses.description" },
  { id: "packages", labelKey: "newShipment.steps.packages.label", descKey: "newShipment.steps.packages.description" },
  { id: "review", labelKey: "newShipment.steps.review.label", descKey: "newShipment.steps.review.description" },
];

const SHIPMENT_TYPE_KEYS = [
  { value: "air", labelKey: "newShipment.shipmentType.air" },
  { value: "ocean", labelKey: "newShipment.shipmentType.ocean" },
];

const ORIGIN_WAREHOUSE = {
  company: "GLOBAL EXPRESS (Korea)",
  address: "76-25 Daehwa-ro, Ilsanseo-gu, Goyang-si, Gyeonggi-do (Bldg. B)",
  phone: "+82-10-4710-5920",
};

const DESTINATION_OFFICE = {
  company: "GLOBAL EXPRESS (Lagos)",
  address: "58B Awoniyi Elemo Street, Ajao Estate, Lagos",
  phone: "+234-000-000-0000",
};

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INTERNAL_TOKEN_KEY = "globalxpress_token";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to verify profile completeness.";
}

const formatDateLabel = (value: Date | null): string => {
  if (!value) return "Select date";
  const locale = i18n.language === "ko" ? "ko-KR" : "en-US";
  return value.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const buildCalendarDays = (
  year: number,
  month: number,
): Array<{
  date: Date;
  day: number;
  isCurrentMonth: boolean;
}> => {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const startDay = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ date: Date; day: number; isCurrentMonth: boolean }> = [];

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startDay + 1;
    if (dayIndex <= 0) {
      const day = daysInPrevMonth + dayIndex;
      cells.push({
        date: new Date(Date.UTC(year, month - 1, day)),
        day,
        isCurrentMonth: false,
      });
    } else if (dayIndex > daysInMonth) {
      const day = dayIndex - daysInMonth;
      cells.push({
        date: new Date(Date.UTC(year, month + 1, day)),
        day,
        isCurrentMonth: false,
      });
    } else {
      cells.push({
        date: new Date(Date.UTC(year, month, dayIndex)),
        day: dayIndex,
        isCurrentMonth: true,
      });
    }
  }

  return cells;
};

interface DatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
}

function DatePicker({ label, value, onChange }: DatePickerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"calendar" | "year">("calendar");
  const [openAbove, setOpenAbove] = useState(false);
  const [month, setMonth] = useState(() => (value ? value.getUTCMonth() : 2));
  const [year, setYear] = useState(() =>
    value ? value.getUTCFullYear() : 2026,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        // Calendar dropdown is roughly 380px tall
        setOpenAbove(spaceBelow < 400);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!value) return;
    setMonth(value.getUTCMonth());
    setYear(value.getUTCFullYear());
  }, [value]);

  const monthLabel = useMemo(() => {
    const date = new Date(Date.UTC(year, month, 1));
    const locale = i18n.language === "ko" ? "ko-KR" : "en-US";
    return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }, [month, year]);

  const days = useMemo(() => buildCalendarDays(year, month), [month, year]);

  return (
    <div className="relative">
      <span className="text-xs font-semibold uppercase text-gray-500">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-brand-400"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {formatDateLabel(value)}
        </span>
        <Calendar className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 right-0 z-10 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg",
            openAbove ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {view === "calendar" ? (
            <>
              <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    if (month === 0) {
                      setMonth(11);
                      setYear((prev) => prev - 1);
                    } else {
                      setMonth((prev) => prev - 1);
                    }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("year")}
                  className="text-brand-600"
                >
                  {monthLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (month === 11) {
                      setMonth(0);
                      setYear((prev) => prev + 1);
                    } else {
                      setMonth((prev) => prev + 1);
                    }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase text-gray-400">
                {daysOfWeek.map((day) => (
                  <span key={day} className="text-center">
                    {day}
                  </span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2 text-sm">
                {days.map((item) => {
                  const isSelected =
                    value &&
                    item.date.getUTCFullYear() === value.getUTCFullYear() &&
                    item.date.getUTCMonth() === value.getUTCMonth() &&
                    item.date.getUTCDate() === value.getUTCDate();

                  return (
                    <button
                      key={`${item.date.toISOString()}-${item.day}`}
                      type="button"
                      onClick={() => {
                        onChange(item.date);
                        setIsOpen(false);
                        setView("calendar");
                      }}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        item.isCurrentMonth
                          ? "text-gray-700 hover:bg-brand-50"
                          : "text-gray-300",
                        isSelected &&
                          "bg-brand-500 text-white hover:bg-brand-500",
                      )}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-gray-500">Select Year</p>
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setYear((prev) => prev - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("calendar")}
                  className="rounded-2xl bg-gray-50 px-6 py-2 text-2xl font-semibold text-gray-800"
                >
                  {year}
                </button>
                <button
                  type="button"
                  onClick={() => setYear((prev) => prev + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Custom TimePicker ───────────────────────────────── */

interface TimePickerProps {
  label: string;
  value: string; // "HH:mm" 24h format
  onChange: (time: string) => void;
}

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${period}`;
}

function TimePicker({ label, value, onChange }: TimePickerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [openAbove, setOpenAbove] = useState(false);

  const [hStr, mStr] = value.split(":");
  const hour24 = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  const isPM = hour24 >= 12;
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setOpenAbove(window.innerHeight - rect.bottom < 320);
      }
      return !prev;
    });
  }, []);

  const setHour = (h12: number): void => {
    const h24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
    onChange(
      `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  };

  const setMinute = (m: number): void => {
    onChange(
      `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  };

  const togglePeriod = (): void => {
    const newH24 = isPM ? hour24 - 12 : hour24 + 12;
    onChange(
      `${String(newH24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="relative">
      <span className="text-xs font-semibold uppercase text-gray-500">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-brand-400"
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          {formatTime12(value)}
        </span>
        <Clock className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 right-0 z-10 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg",
            openAbove ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <div className="flex gap-3">
            {/* Hours column */}
            <div className="flex-1">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase text-gray-400">
                Hour
              </p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 p-1">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHour(h)}
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg py-1.5 text-sm",
                      h === hour12
                        ? "bg-brand-500 font-semibold text-white"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes column */}
            <div className="flex-1">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase text-gray-400">
                Min
              </p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 p-1">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinute(m)}
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg py-1.5 text-sm",
                      m === minute
                        ? "bg-brand-500 font-semibold text-white"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM column */}
            <div className="flex flex-col items-center gap-2 pt-6">
              <button
                type="button"
                onClick={() => {
                  if (isPM) togglePeriod();
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold",
                  !isPM
                    ? "bg-brand-500 text-white"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isPM) togglePeriod();
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold",
                  isPM
                    ? "bg-brand-500 text-white"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                PM
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full rounded-xl bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export function NewShipmentPage(): ReactElement {
  const { t } = useTranslation("shipments");
  const { data, isLoading, error } = useDashboardData();
  const { user } = useAuth();
  const steps: StepDefinition[] = STEP_KEYS.map((s) => ({ id: s.id, label: t(s.labelKey), description: t(s.descKey) }));
  const shipmentTypes = SHIPMENT_TYPE_KEYS.map((s) => ({ value: s.value, label: t(s.labelKey) }));
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [shipmentType, setShipmentType] = useState("air");
  const [pickupDate, setPickupDate] = useState<Date | null>(
    new Date(Date.UTC(2026, 1, 20)),
  );
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState("09:30");
  const [deliveryTime, setDeliveryTime] = useState("16:00");
  const [packageDescription, setPackageDescription] = useState("");
  const [packageWeightKg, setPackageWeightKg] = useState("");
  const [packageCbm, setPackageCbm] = useState("");
  const [packageDeclaredValue, setPackageDeclaredValue] = useState("");
  const [estimate, setEstimate] = useState<ShippingEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [usePickupRep, setUsePickupRep] = useState(false);
  const [pickupRepName, setPickupRepName] = useState("");
  const [pickupRepPhone, setPickupRepPhone] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCheckingCompleteness, setIsCheckingCompleteness] = useState(false);
  const [completenessError, setCompletenessError] = useState<string | null>(
    null,
  );
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdTrackingNumber, setCreatedTrackingNumber] = useState<
    string | null
  >(null);
  const [copied, setCopied] = useState(false);

  const progress = Math.round(((activeStep + 1) / steps.length) * 100);
  const isCustomer = isClerkSignedIn && !user;

  useEffect(() => {
    if (!isCustomer) return;

    let isMounted = true;

    const checkCompleteness = async (): Promise<void> => {
      setIsCheckingCompleteness(true);
      setCompletenessError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Authentication token is missing.");
        }

        await syncClerkAccount(token);
        const completeness = await getMyProfileCompleteness(token);
        if (!completeness.isComplete && isMounted) {
          navigate(ROUTES.COMPLETE_PROFILE, { replace: true });
        }
      } catch (checkError) {
        if (isMounted) {
          setCompletenessError(getErrorMessage(checkError));
        }
      } finally {
        if (isMounted) {
          setIsCheckingCompleteness(false);
        }
      }
    };

    void checkCompleteness();

    return () => {
      isMounted = false;
    };
  }, [getToken, isCustomer, navigate]);

  /* ── Debounced shipping cost estimate ──────────────── */
  const fetchEstimate = useCallback(async () => {
    const weightVal = parseFloat(packageWeightKg);
    const cbmVal = parseFloat(packageCbm);
    const hasAirInput =
      shipmentType === "air" && Number.isFinite(weightVal) && weightVal > 0;
    const hasOceanInput =
      shipmentType === "ocean" && Number.isFinite(cbmVal) && cbmVal > 0;

    if (!hasAirInput && !hasOceanInput) {
      setEstimate(null);
      return;
    }

    setEstimateLoading(true);
    try {
      const token = isCustomer
        ? await getToken()
        : localStorage.getItem(INTERNAL_TOKEN_KEY);
      if (!token) return;

      const payload =
        shipmentType === "air"
          ? { shipmentType: "air" as const, weightKg: weightVal }
          : { shipmentType: "ocean" as const, cbm: cbmVal };

      const result = await estimateShippingCost(token, payload);
      setEstimate(result);
    } catch {
      /* Silently ignore — estimate is non-critical */
    } finally {
      setEstimateLoading(false);
    }
  }, [shipmentType, packageWeightKg, packageCbm, isCustomer, getToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEstimate();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchEstimate]);

  const goNext = (): void => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goPrevious = (): void => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const getApiToken = async (): Promise<string | null> => {
    if (isCustomer) return getToken();
    return localStorage.getItem(INTERNAL_TOKEN_KEY);
  };

  const handlePrimaryAction = async (): Promise<void> => {
    if (activeStep < steps.length - 1) {
      goNext();
      return;
    }

    setCreateError(null);

    if (
      !recipientName.trim() ||
      !recipientEmail.trim() ||
      !recipientPhone.trim()
    ) {
      setCreateError(t("newShipment.errors.recipientRequired"));
      setActiveStep(2);
      return;
    }

    if (usePickupRep && !pickupRepName.trim()) {
      setCreateError(t("newShipment.errors.pickupRepRequired"));
      setActiveStep(2);
      return;
    }

    const missingMeasure =
      shipmentType === "air" ? !packageWeightKg.trim() : !packageCbm.trim();

    if (missingMeasure || !packageDeclaredValue.trim()) {
      setCreateError(
        shipmentType === "air"
          ? "Please provide package weight and declared value."
          : "Please provide package volume (CBM) and declared value.",
      );
      setActiveStep(2);
      return;
    }

    setIsCreatingOrder(true);
    try {
      const token = await getApiToken();
      if (!token) throw new Error("Authentication token is missing.");

      const recipientAddress = DESTINATION_OFFICE.address;

      const order = await createOrder(
        {
          recipientName: recipientName.trim(),
          recipientAddress,
          recipientPhone: recipientPhone.trim(),
          recipientEmail: recipientEmail.trim(),
          orderDirection: "outbound",
          weight:
            shipmentType === "air" ? packageWeightKg.trim() : packageCbm.trim(),
          declaredValue: packageDeclaredValue.trim(),
          description: packageDescription.trim(),
          shipmentType: shipmentType as "air" | "ocean",
          departureDate: pickupDate?.toISOString(),
          eta: deliveryDate?.toISOString(),
          ...(usePickupRep && pickupRepName.trim() && {
            pickupRepName: pickupRepName.trim(),
            pickupRepPhone: pickupRepPhone.trim() || undefined,
          }),
        },
        token,
      );

      setCreatedTrackingNumber(order.trackingNumber ?? null);
      setShowConfirmation(true);
    } catch (createOrderError) {
      const message =
        createOrderError instanceof Error
          ? createOrderError.message
          : t("newShipment.errors.failedToCreate");
      setCreateError(message);

      if (isCustomer && /profile/i.test(message)) {
        navigate(ROUTES.COMPLETE_PROFILE, { replace: true });
      }

      return;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <AppShell
      data={data}
      isLoading={isLoading || isCheckingCompleteness}
      error={completenessError ?? error}
      loadingLabel={t("newShipment.loadingLabel")}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isCustomer ? t("newShipment.titleCustomer") : t("newShipment.titleOperator")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isCustomer
              ? t("newShipment.subtitleCustomer")
              : t("newShipment.subtitleOperator")}
          </p>
        </div>

        {createError && <AlertBanner tone="error" message={createError} />}

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {t("newShipment.progress.step", { current: activeStep + 1, total: steps.length })}
            </span>
            <span>{t("newShipment.progress.complete", { percent: progress })}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-400 sm:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.id} className="space-y-1">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    index <= activeStep ? "text-gray-700" : "text-gray-400",
                  )}
                >
                  {step.label}
                </p>
                <p className="hidden text-[11px] sm:block">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Step 0 — Shipment Type */}
        {activeStep === 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("newShipment.shipmentType.sectionTitle")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("newShipment.shipmentType.sectionSubtitle")}
            </p>

            <div className="mt-6">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {t("newShipment.shipmentType.sectionTitle")}
                </p>
                <div className="mt-4 space-y-3">
                  {shipmentTypes.map((item) => (
                    <label
                      key={item.value}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition",
                        shipmentType === item.value
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-gray-200 text-gray-700 hover:border-brand-300",
                      )}
                    >
                      <input
                        type="radio"
                        name="shipment-type"
                        value={item.value}
                        checked={shipmentType === item.value}
                        onChange={() => setShipmentType(item.value)}
                        className="sr-only"
                      />
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-brand-500">
                        {shipmentType === item.value && (
                          <span className="h-2 w-2 rounded-full bg-brand-500" />
                        )}
                      </span>
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <DatePicker
                    label={t("newShipment.schedule.pickupDate")}
                    value={pickupDate}
                    onChange={setPickupDate}
                  />
                  <DatePicker
                    label={t("newShipment.schedule.preferredDeliveryDate")}
                    value={deliveryDate}
                    onChange={setDeliveryDate}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TimePicker
                    label={t("newShipment.schedule.pickupTime")}
                    value={pickupTime}
                    onChange={setPickupTime}
                  />
                  <TimePicker
                    label={t("newShipment.schedule.deliveryTime")}
                    value={deliveryTime}
                    onChange={setDeliveryTime}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 1 — Addresses (both read-only) */}
        {activeStep === 1 && (
          <section className="space-y-6">
            {/* Origin — Korea warehouse */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("newShipment.originAddress.title")}
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                {t("newShipment.originAddress.subtitle")}
              </p>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    {t("newShipment.originAddress.companyName")}
                  </span>
                  <input
                    type="text"
                    value={ORIGIN_WAREHOUSE.company}
                    readOnly
                    className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    {t("newShipment.originAddress.phoneNumber")}
                  </span>
                  <input
                    type="tel"
                    value={ORIGIN_WAREHOUSE.phone}
                    readOnly
                    className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    {t("newShipment.originAddress.address")}
                  </span>
                  <input
                    type="text"
                    value={ORIGIN_WAREHOUSE.address}
                    readOnly
                    className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Destination — Lagos office */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("newShipment.destinationAddress.title")}
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                {t("newShipment.destinationAddress.subtitle")}
              </p>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    {t("newShipment.originAddress.companyName")}
                  </span>
                  <input
                    type="text"
                    value={DESTINATION_OFFICE.company}
                    readOnly
                    className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    {t("newShipment.destinationAddress.phoneNumber")}
                  </span>
                  <input
                    type="tel"
                    value={DESTINATION_OFFICE.phone}
                    readOnly
                    className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    {t("newShipment.destinationAddress.address")}
                  </span>
                  <input
                    type="text"
                    value={DESTINATION_OFFICE.address}
                    readOnly
                    className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 2 — Package Details */}
        {activeStep === 2 && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t("newShipment.packageDetails.title")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {t("newShipment.packageDetails.subtitle")}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {t("newShipment.packageDetails.descriptionLabel")}
                </span>
                <input
                  type="text"
                  value={packageDescription}
                  onChange={(event) =>
                    setPackageDescription(event.target.value)
                  }
                  placeholder={t("newShipment.packageDetails.descriptionPlaceholder")}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {shipmentType === "air" ? (
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {t("newShipment.packageDetails.weightLabel")}
                    </span>
                    <input
                      type="number"
                      value={packageWeightKg}
                      onChange={(event) =>
                        setPackageWeightKg(event.target.value)
                      }
                      placeholder={t("newShipment.packageDetails.weightPlaceholder")}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {t("newShipment.packageDetails.volumeLabel")}
                    </span>
                    <input
                      type="number"
                      value={packageCbm}
                      onChange={(event) => setPackageCbm(event.target.value)}
                      placeholder={t("newShipment.packageDetails.volumePlaceholder")}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    {t("newShipment.packageDetails.declaredValueLabel")}
                  </span>
                  <input
                    type="number"
                    value={packageDeclaredValue}
                    onChange={(event) =>
                      setPackageDeclaredValue(event.target.value)
                    }
                    placeholder={t("newShipment.packageDetails.declaredValuePlaceholder")}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <p className="text-sm font-semibold text-gray-700">
                  {t("newShipment.recipientInfo.sectionTitle")}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {t("newShipment.recipientInfo.nameLabel")}
                    </span>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(event) => setRecipientName(event.target.value)}
                      placeholder={t("newShipment.recipientInfo.namePlaceholder")}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {t("newShipment.recipientInfo.emailLabel")}
                    </span>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(event) =>
                        setRecipientEmail(event.target.value)
                      }
                      placeholder={t("newShipment.recipientInfo.emailPlaceholder")}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {t("newShipment.recipientInfo.phoneLabel")}
                    </span>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(event) =>
                        setRecipientPhone(event.target.value)
                      }
                      placeholder={t("newShipment.recipientInfo.phonePlaceholder")}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <Checkbox
                    label={t("newShipment.recipientInfo.usePickupRepLabel")}
                    checked={usePickupRep}
                    onChange={(e) => setUsePickupRep(e.target.checked)}
                  />
                </div>

                {usePickupRep && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <span className="text-xs font-semibold uppercase text-gray-500">
                        {t("newShipment.recipientInfo.repNameLabel")}
                      </span>
                      <input
                        type="text"
                        value={pickupRepName}
                        onChange={(e) => setPickupRepName(e.target.value)}
                        placeholder={t("newShipment.recipientInfo.repNamePlaceholder")}
                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase text-gray-500">
                        {t("newShipment.recipientInfo.repPhoneLabel")}
                      </span>
                      <input
                        type="tel"
                        value={pickupRepPhone}
                        onChange={(e) => setPickupRepPhone(e.target.value)}
                        placeholder={t("newShipment.recipientInfo.repPhonePlaceholder")}
                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-brand-100 px-6 py-5">
              <div className="grid gap-4 text-center text-sm font-semibold text-gray-700 sm:grid-cols-2">
                <div>
                  <p className="text-2xl font-semibold">
                    {shipmentType === "air"
                      ? packageWeightKg.trim()
                        ? `${packageWeightKg.trim()} kg`
                        : "0.0 kg"
                      : packageCbm.trim()
                        ? `${packageCbm.trim()} CBM`
                        : "0.0 CBM"}
                  </p>
                  <p className="text-xs uppercase text-gray-500">
                    {shipmentType === "air" ? t("newShipment.review.totalWeightLabel") : t("newShipment.review.totalVolumeLabel")}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    ${packageDeclaredValue.trim() || "0.00"}
                  </p>
                  <p className="text-xs uppercase text-gray-500">
                    {t("newShipment.review.declaredValueLabel")}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 3 — Review */}
        {activeStep === 3 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("newShipment.review.title")}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {t("newShipment.review.subtitle")}
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {t("newShipment.review.shipmentSummary")}
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>{t("newShipment.review.typeLabel")}</span>
                      <span className="font-semibold text-gray-800 capitalize">
                        {shipmentType === "air"
                          ? t("newShipment.review.airFreight")
                          : t("newShipment.review.oceanFreight")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>
                        {shipmentType === "air"
                          ? t("newShipment.review.totalWeightLabel")
                          : t("newShipment.review.totalVolumeLabel")}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {shipmentType === "air"
                          ? packageWeightKg.trim()
                            ? `${packageWeightKg.trim()} kg`
                            : "0.0 kg"
                          : packageCbm.trim()
                            ? `${packageCbm.trim()} CBM`
                            : "0.0 CBM"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                      <span>{t("newShipment.review.declaredValueLabel")}</span>
                      <span className="font-semibold text-gray-800">
                        ${packageDeclaredValue.trim() || "0.00"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700">{t("newShipment.review.route")}</p>
                  <div className="mt-3 text-sm text-gray-600">
                    <p className="font-semibold text-gray-800">{t("newShipment.review.from")}</p>
                    <p className="text-xs text-gray-400">
                      {ORIGIN_WAREHOUSE.company}
                    </p>
                    <p>{ORIGIN_WAREHOUSE.address}</p>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p className="font-semibold text-gray-800">{t("newShipment.review.to")}</p>
                    <p className="text-xs text-gray-400">
                      {DESTINATION_OFFICE.company}
                    </p>
                    <p>{DESTINATION_OFFICE.address}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {t("newShipment.review.recipient")}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p>{recipientName || "—"}</p>
                    <p>{recipientEmail || "—"}</p>
                    <p>{recipientPhone || "—"}</p>
                  </div>
                </div>

                {usePickupRep && pickupRepName.trim() && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {t("newShipment.review.pickupRepresentative")}
                    </p>
                    <div className="mt-3 space-y-1 text-sm text-gray-600">
                      <p>{pickupRepName}</p>
                      <p>{pickupRepPhone || "—"}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Package className="h-4 w-4 text-brand-500" />
                  {t("newShipment.review.costEstimate")}
                </div>

                {estimateLoading ? (
                  <div className="mt-6 flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("newShipment.review.calculatingEstimate")}
                  </div>
                ) : estimate ? (
                  <>
                    <div className="mt-4 space-y-3 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>{t("newShipment.review.estimatedShippingCost")}</span>
                        <span className="font-semibold text-gray-800">
                          $
                          {estimate.estimatedCostUsd.toLocaleString(i18n.language === "ko" ? "ko-KR" : "en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Departure Schedule</span>
                        <span className="font-semibold text-gray-800">
                          Departures: {estimate.departureFrequency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                        <span>Est. Transit Time</span>
                        <span className="font-semibold text-gray-800">
                          ~{estimate.estimatedTransitDays} days
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void fetchEstimate()}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                    >
                      <Check className="h-4 w-4" />
                      {t("newShipment.review.recalculate")}
                    </button>

                    <p className="mt-4 text-xs text-gray-400">
                      {estimate.disclaimer}
                    </p>
                  </>
                ) : (
                  <p className="mt-6 py-6 text-center text-sm text-gray-400">
                    {shipmentType === "air"
                      ? t("newShipment.review.enterWeightForEstimate")
                      : t("newShipment.review.enterVolumeForEstimate")}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={goPrevious}>
            {t("newShipment.navigation.previous")}
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" className="border-gray-300">
              {t("newShipment.navigation.saveDraft")}
            </Button>
            <Button
              size="sm"
              onClick={() => void handlePrimaryAction()}
              disabled={isCreatingOrder}
            >
              {activeStep === steps.length - 1
                ? isCreatingOrder
                  ? isCustomer
                    ? t("newShipment.navigation.creatingShipment")
                    : t("newShipment.navigation.creatingOrder")
                  : isCustomer
                    ? t("newShipment.navigation.createShipment")
                    : t("newShipment.navigation.createOrder")
                : t("newShipment.navigation.next")}
            </Button>
          </div>
        </div>
      </div>

      {/* Success confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setShowConfirmation(false)}
              className="absolute right-5 top-5 text-gray-400 transition hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {isCustomer ? t("newShipment.confirmation.shipmentCreated") : t("newShipment.confirmation.orderCreated")}
                </p>
                <p className="text-sm text-gray-500">
                  {isCustomer
                    ? t("newShipment.confirmation.shipmentSaved")
                    : t("newShipment.confirmation.orderSaved")}
                </p>
                {createdTrackingNumber && (
                  <p className="mt-1 text-xs font-semibold text-brand-600">
                    {t("newShipment.confirmation.trackingNumber", { number: createdTrackingNumber })}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {isCustomer
                ? t("newShipment.confirmation.customerNote")
                : t("newShipment.confirmation.operatorNote")}
            </div>

            {/* Share buttons */}
            {createdTrackingNumber && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-gray-400">
                  {t("newShipment.confirmation.shareDetails")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {(() => {
                    const trackUrl = `${window.location.origin}${ROUTES.TRACK_PUBLIC}/${createdTrackingNumber}`;
                    const typeLabel =
                      shipmentType === "air" ? "Air Freight" : "Ocean Freight";
                    const costLabel = estimate
                      ? `$${estimate.estimatedCostUsd.toLocaleString(i18n.language === "ko" ? "ko-KR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "";
                    const lines = [
                      "Global Express — Order Confirmation",
                      `Tracking Number: ${createdTrackingNumber}`,
                      `Type: ${typeLabel}`,
                      ...(costLabel ? [`Estimated Cost: ${costLabel}`] : []),
                      `Track your shipment: ${trackUrl}`,
                    ];
                    const body = lines.join("\n");

                    const handleCopy = async (): Promise<void> => {
                      await navigator.clipboard.writeText(body);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    };

                    return (
                      <>
                        {/* Copy */}
                        <button
                          type="button"
                          onClick={() => void handleCopy()}
                          className={cn(
                            "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition",
                            copied
                              ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                              : "border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500",
                          )}
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copied ? t("newShipment.confirmation.copied") : t("newShipment.confirmation.copy")}
                        </button>
                        {/* Email */}
                        <a
                          href={`mailto:?subject=${encodeURIComponent(`Global Express — Tracking ${createdTrackingNumber}`)}&body=${encodeURIComponent(body)}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-brand-400 hover:text-brand-500"
                          title={t("newShipment.confirmation.shareViaEmail")}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        {/* WhatsApp */}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(body)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-green-500 hover:text-green-500"
                          title={t("newShipment.confirmation.shareViaWhatsApp")}
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                        {/* KakaoTalk */}
                        <a
                          href={`https://story.kakao.com/share?url=${encodeURIComponent(trackUrl)}&text=${encodeURIComponent(body)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-yellow-500 hover:text-yellow-500"
                          title={t("newShipment.confirmation.shareViaKakaoTalk")}
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.664 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 00-.656-.678l-1.928 1.866V9.282a.472.472 0 00-.944 0v2.557a.471.471 0 000 .222v2.218a.472.472 0 00.944 0v-1.58l.478-.46 1.532 2.283a.472.472 0 00.784-.527l-1.68-2.502zm-4.356-1.778h-.944v3.397a.472.472 0 00.944 0V9.282zm-2.004 3.397a.472.472 0 00.944 0V9.282a.472.472 0 00-.944 0v3.397zm-2.835-1.28l-1.1-2.117a.472.472 0 00-.841.424l.779 1.54h-.779a.472.472 0 000 .944h1.47a.472.472 0 00.471-.791z" />
                          </svg>
                        </a>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setShowConfirmation(false);
                  navigate(ROUTES.ORDERS);
                }}
              >
                {t("newShipment.confirmation.done")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
