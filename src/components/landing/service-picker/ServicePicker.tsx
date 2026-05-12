"use client";

/* ─────────────────────────────────────────────────────────────
   SERVICE PICKER
   Qwikly offers both Digital Assistant + Pipeline as a single
   combined offering. The picker now only has one option so
   visitors don't need to choose — they always get both.
   ───────────────────────────────────────────────────────────── */

export type ServiceInterest = "Digital Assistant" | "Pipeline" | "Both / not sure";

export const SERVICE_INTEREST_OPTIONS: ServiceInterest[] = [
  "Both / not sure",
];

export const DEFAULT_SERVICE_INTEREST: ServiceInterest = "Both / not sure";

type Props = {
  value: ServiceInterest;
  onChange: (value: ServiceInterest) => void;
  name?: string;
  label?: string;
  helper?: string;
};

export default function ServicePicker({
  value: _value,
  onChange: _onChange,
  name = "service_interest",
}: Props) {
  return (
    <>
      <input type="hidden" name={name} value="Both / not sure" />
    </>
  );
}
