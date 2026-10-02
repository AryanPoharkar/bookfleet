"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createBusinessAction, checkSlugAction } from "@/features/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const timezones = Array.from(
  new Set(["UTC", ...Intl.supportedValuesOf("timeZone")]),
).sort();

export function OnboardingForm() {
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const timezoneSelectRef = useRef<HTMLSelectElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const browserTimezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (timezoneSelectRef.current) {
      timezoneSelectRef.current.value = browserTimezone;
    }
  }, []);

  useEffect(() => {
    if (!slug) return;

    const timer = window.setTimeout(() => {
      const formData = new FormData();
      formData.set("slug", slug);
      startTransition(async () => {
        const result = await checkSlugAction(formData);
        setSlugStatus(result.status);
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [slug]);

  return (
    <form
      action={async (formData) => {
        setError("");
        const result = await createBusinessAction({}, formData);
        if (result?.error) setError(result.error);
      }}
      className="space-y-5"
    >
      <label className="block text-sm font-medium">
        Business name
        <Input name="name" required className="mt-2" />
      </label>

      <label className="block text-sm font-medium">
        Slug
        <Input
          name="slug"
          value={slug}
          required
          className="mt-2"
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugStatus("");
          }}
        />
      </label>

      {slugStatus && (
        <p className="text-sm text-muted-foreground" role="status">
          {slugStatus === "available"
            ? "Available"
            : slugStatus === "taken"
              ? "Already taken"
              : slugStatus === "reserved"
                ? "Reserved"
                : "Invalid slug"}
        </p>
      )}

      <label className="block text-sm font-medium">
        Timezone
        <select
          ref={timezoneSelectRef}
          name="timezone"
          defaultValue={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="mt-2 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
        >
          {timezones.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium">
        Currency
        <select
          name="currency"
          defaultValue="USD"
          className="mt-2 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
        >
          <option>USD</option>
          <option>EUR</option>
          <option>GBP</option>
          <option>INR</option>
          <option>CAD</option>
          <option>AUD</option>
        </select>
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        Create business
      </Button>
    </form>
  );
}
