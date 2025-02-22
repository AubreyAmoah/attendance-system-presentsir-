// components/CourseCalendar.jsx
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CourseCalendar({ courseId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, [courseId, currentDate]);

  const fetchSessions = async () => {
    try {
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );

      const response = await fetch(
        `/api/courses/${courseId}/schedule?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`
      );

      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      setSessions(data.sessionDates);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getSessionForDate = (date) => {
    return sessions.find(
      (session) => session.date === date.toISOString().split("T")[0]
    );
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const renderCalendar = () => {
    const days = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);
    const calendar = [];
    let week = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      week.push(<td key={`empty-${i}`} className="p-2"></td>);
    }

    // Add days of the month
    for (let day = 1; day <= days; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      const session = getSessionForDate(date);
      const isCurrentDay = isToday(date);

      week.push(
        <td
          key={day}
          className={`p-2 border relative min-h-[100px] ${
            isCurrentDay ? "bg-blue-50" : ""
          }`}
        >
          <div className="absolute top-1 left-1 text-sm">{day}</div>
          {session && (
            <div
              className={`
            mt-6 p-1 text-xs rounded
            ${
              session.isException
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }
          `}
            >
              {session.isException ? (
                "Class Cancelled"
              ) : (
                <>
                  <div className="font-semibold">Class Session</div>
                  <div>
                    {session.startTime} - {session.endTime}
                  </div>
                </>
              )}
            </div>
          )}
        </td>
      );

      if (week.length === 7) {
        calendar.push(<tr key={day}>{week}</tr>);
        week = [];
      }
    }

    // Add remaining empty cells
    while (week.length < 7 && week.length > 0) {
      week.push(<td key={`empty-end-${week.length}`} className="p-2"></td>);
    }

    if (week.length > 0) {
      calendar.push(<tr key="last-week">{week}</tr>);
    }

    return calendar;
  };

  const changeMonth = (increment) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + increment);
      return newDate;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">Error: {error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <th
                  key={day}
                  className="p-2 border-b text-sm font-medium text-gray-600"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{renderCalendar()}</tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-100 rounded mr-2"></div>
            <span>Class Session</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-50 rounded mr-2"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
