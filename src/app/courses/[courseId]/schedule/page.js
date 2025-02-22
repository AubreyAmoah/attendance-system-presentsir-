// app/courses/[courseId]/schedule/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function CourseSchedulePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [schedule, setSchedule] = useState({
    daysOfWeek: [],
    startTime: "",
    endTime: "",
    startDate: "",
    endDate: "",
    recurrence: {
      pattern: "weekly", // weekly, biweekly, custom
      interval: 1,
      exceptions: [], // Array of dates when class won't occur
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [newException, setNewException] = useState("");

  useEffect(() => {
    fetchCourse();
  }, [params.courseId]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}`);
      if (!response.ok) throw new Error("Failed to fetch course");
      const data = await response.json();
      setCourse(data);
      setSchedule({
        daysOfWeek: data.daysOfWeek || [],
        startTime: data.startTime || "",
        endTime: data.endTime || "",
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        recurrence: data.recurrence || {
          pattern: "weekly",
          interval: 1,
          exceptions: [],
        },
      });
      setExceptions(data.recurrence?.exceptions || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const addException = () => {
    if (newException && !exceptions.includes(newException)) {
      setExceptions([...exceptions, newException]);
      setNewException("");
      setSchedule((prev) => ({
        ...prev,
        recurrence: {
          ...prev.recurrence,
          exceptions: [...exceptions, newException],
        },
      }));
    }
  };

  const removeException = (date) => {
    const updatedExceptions = exceptions.filter((d) => d !== date);
    setExceptions(updatedExceptions);
    setSchedule((prev) => ({
      ...prev,
      recurrence: {
        ...prev.recurrence,
        exceptions: updatedExceptions,
      },
    }));
  };

  const validateSchedule = () => {
    if (schedule.daysOfWeek.length === 0) {
      throw new Error("Please select at least one day");
    }
    if (!schedule.startTime || !schedule.endTime) {
      throw new Error("Please set both start and end times");
    }
    if (!schedule.startDate || !schedule.endDate) {
      throw new Error("Please set course start and end dates");
    }

    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate);
    if (startDate >= endDate) {
      throw new Error("Start date must be before end date");
    }

    const [startHour, startMinute] = schedule.startTime.split(":");
    const [endHour, endMinute] = schedule.endTime.split(":");
    const startMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
    const endMinutes = parseInt(endHour) * 60 + parseInt(endMinute);

    if (startMinutes >= endMinutes) {
      throw new Error("Start time must be before end time");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      validateSchedule();
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/courses/${params.courseId}/schedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(schedule),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update schedule");
      }

      router.push(`/courses/${params.courseId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Update Course Schedule
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {course?.name} ({course?.code})
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Course Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Course Start Date
                </label>
                <input
                  type="date"
                  value={schedule.startDate}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Course End Date
                </label>
                <input
                  type="date"
                  value={schedule.endDate}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Class Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Recurrence Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Recurrence Pattern
              </label>
              <select
                value={schedule.recurrence.pattern}
                onChange={(e) =>
                  setSchedule((prev) => ({
                    ...prev,
                    recurrence: {
                      ...prev.recurrence,
                      pattern: e.target.value,
                    },
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="custom">Custom</option>
              </select>

              {schedule.recurrence.pattern === "custom" && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Interval (weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={schedule.recurrence.interval}
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        recurrence: {
                          ...prev.recurrence,
                          interval: parseInt(e.target.value),
                        },
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Exceptions */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Add Exception Dates
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="date"
                  value={newException}
                  onChange={(e) => setNewException(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addException}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Add
                </button>
              </div>

              {exceptions.length > 0 && (
                <div className="mt-2 space-y-2">
                  {exceptions.map((date) => (
                    <div
                      key={date}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                    >
                      <span>{new Date(date).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => removeException(date)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push(`/courses/${params.courseId}`)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              >
                {saving ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
