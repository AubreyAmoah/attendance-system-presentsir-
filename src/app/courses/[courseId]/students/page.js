"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ManageStudentsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

  useEffect(() => {
    fetchStudents();
  }, [params.courseId]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}/students`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      } else {
        throw new Error("Failed to fetch students");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/courses/${params.courseId}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newStudentEmail }),
      });

      if (response.ok) {
        setNewStudentEmail("");
        fetchStudents();
      } else {
        const data = await response.json();
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const removeStudent = async (studentEmail) => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/students/${encodeURIComponent(
          studentEmail
        )}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        fetchStudents();
      } else {
        const data = await response.json();
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Manage Students
        </h1>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={addStudent} className="mb-6">
            <div className="flex gap-4">
              <input
                type="email"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                placeholder="Student email"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Add Student
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.email}
                className="flex justify-between items-center p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-gray-500">{student.email}</p>
                </div>
                <button
                  onClick={() => removeStudent(student.email)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
