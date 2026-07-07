"use client";

import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { X, CalendarDays } from "lucide-react";

interface CompareCalendarProps {
  availableDates: string[];
  selectedDate?: string;
  onSelect: (dateSort: string) => void;
  onClose: () => void;
}

export function CompareCalendar({
  availableDates,
  selectedDate,
  onSelect,
  onClose,
}: CompareCalendarProps) {
  const availableSet = useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return undefined;
    const parts = selectedDate.split("-");
    if (parts.length !== 3) return undefined;
    const d = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );
    if (isNaN(d.getTime())) return undefined;
    return d;
  }, [selectedDate]);

  const handleDayClick = (day: Date) => {
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, "0");
    const dd = String(day.getDate()).padStart(2, "0");
    const dateSort = `${yyyy}-${mm}-${dd}`;
    if (availableSet.has(dateSort)) {
      onSelect(dateSort);
      onClose();
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  };

  return (
    <div className="w-[300px] p-0">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold">Pilih Tanggal Banding</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-gray-500" />
        </button>
      </div>
      <div className="p-3">
        <Calendar
          mode="single"
          selected={selectedDateObj}
          onSelect={(day) => {
            if (day) handleDayClick(day);
          }}
          modifiers={{
            available: (day) => {
              const yyyy = day.getFullYear();
              const mm = String(day.getMonth() + 1).padStart(2, "0");
              const dd = String(day.getDate()).padStart(2, "0");
              return availableSet.has(`${yyyy}-${mm}-${dd}`);
            },
          }}
          modifiersClassNames={{
            available: "bg-emerald-100 text-emerald-800 font-semibold",
          }}
          className="rounded-md border"
        />
      </div>
      {availableDates.length > 0 && (
        <div className="px-3 pb-3">
          <p className="text-[10px] text-muted-foreground mb-1.5">
            Tanggal tersedia:
          </p>
          <div className="flex flex-wrap gap-1">
            {availableDates.map((d) => (
              <button
                key={d}
                onClick={() => {
                  onSelect(d);
                  onClose();
                }}
                className="group"
              >
                <Badge
                  variant={
                    selectedDate === d ? "default" : "outline"
                  }
                  className="text-[10px] cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                >
                  {formatDateLabel(d)}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}