export default function CourseEnrollmentCard({ course, onEnroll }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{course.name}</h3>
          <p className="mt-1 text-sm text-gray-500">Code: {course.code}</p>
          <p className="mt-1 text-sm text-gray-500">
            Schedule: {course.schedule}
          </p>

          {course.lecturerName && (
            <p className="mt-1 text-sm text-gray-500">
              Lecturer: {course.lecturerName}
            </p>
          )}

          <p className="mt-2 text-sm text-gray-600">
            Students Enrolled: {course.students?.length || 0}
          </p>
        </div>

        <button
          onClick={() => onEnroll(course._id)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Enroll
        </button>
      </div>
    </div>
  );
}
